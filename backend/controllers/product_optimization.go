package controllers

import (
	"net/http"
	"time"

	"fanuc-backend/config"
	"fanuc-backend/models"

	"github.com/gin-gonic/gin"
)

// ProductOptimizationController handles product content optimization
type ProductOptimizationController struct{}

// OptimizeProduct optimizes a single product's SEO content
func (poc *ProductOptimizationController) OptimizeProduct(c *gin.Context) {
	var request models.ProductOptimizationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request",
			Error:   err.Error(),
		})
		return
	}

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Database connection failed",
		})
		return
	}

	// Get the product
	var product models.Product
	if err := db.First(&product, request.ProductID).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Product not found",
		})
		return
	}

	// Check if optimization is needed
	if !request.ForceUpdate && product.LastOptimizedAt != nil {
		// Check if product was optimized recently (within 7 days)
		if time.Since(*product.LastOptimizedAt) < 7*24*time.Hour {
			c.JSON(http.StatusOK, models.ProductOptimizationResponse{
				ProductID:          request.ProductID,
				SKU:                product.SKU,
				OptimizationStatus: "skipped",
				ContentUpdated:     false,
				SEOScoreBefore:     product.SEOScore,
				SEOScoreAfter:      product.SEOScore,
				Message:            "Product was recently optimized",
			})
			return
		}
	}

	seoBefore := product.SEOScore

	// Calculate SEO score and update product
	seoScore := poc.calculateSEOScore(&product)
	now := time.Now()

	// Update product with optimization timestamp and score
	updateData := map[string]interface{}{
		"seo_score":          seoScore,
		"last_optimized_at":  &now,
		"updated_at":         now,
	}

	// Enhance content if needed
	contentUpdated := poc.enhanceProductContent(&product, updateData)

	if err := db.Model(&product).Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to update product",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ProductOptimizationResponse{
		ProductID:          request.ProductID,
		SKU:                product.SKU,
		OptimizationStatus: "completed",
		ContentUpdated:     contentUpdated,
		SEOScoreBefore:     seoBefore,
		SEOScoreAfter:      seoScore,
		Message:            "Product optimization completed successfully",
	})
}

// BulkOptimizeProducts optimizes multiple products
func (poc *ProductOptimizationController) BulkOptimizeProducts(c *gin.Context) {
	var request models.BulkOptimizationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request",
			Error:   err.Error(),
		})
		return
	}

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Database connection failed",
		})
		return
	}

	var products []models.Product
	query := db.Where("is_active = ?", true)

	// Apply filters
	if len(request.ProductIDs) > 0 {
		query = query.Where("id IN ?", request.ProductIDs)
	}

	if request.CategoryID != nil {
		query = query.Where("category_id = ?", *request.CategoryID)
	}

	if !request.ForceUpdate {
		// Only get products that need optimization
		query = query.Where("(last_optimized_at IS NULL OR last_optimized_at < ?)",
			time.Now().AddDate(0, 0, -7))
	}

	// Apply limit
	limit := request.Limit
	if limit <= 0 || limit > 100 {
		limit = 50 // Default limit
	}
	query = query.Limit(limit)

	if err := query.Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to fetch products",
			Error:   err.Error(),
		})
		return
	}

	results := make([]models.ProductOptimizationResponse, 0, len(products))

	for _, product := range products {
		seoBefore := product.SEOScore
		seoScore := poc.calculateSEOScore(&product)
		now := time.Now()

		updateData := map[string]interface{}{
			"seo_score":         seoScore,
			"last_optimized_at": &now,
			"updated_at":        now,
		}

		contentUpdated := poc.enhanceProductContent(&product, updateData)

		if err := db.Model(&product).Updates(updateData).Error; err == nil {
			results = append(results, models.ProductOptimizationResponse{
				ProductID:          int(product.ID),
				SKU:                product.SKU,
				OptimizationStatus: "completed",
				ContentUpdated:     contentUpdated,
				SEOScoreBefore:     seoBefore,
				SEOScoreAfter:      seoScore,
				Message:            "Optimized successfully",
			})
		} else {
			results = append(results, models.ProductOptimizationResponse{
				ProductID:          int(product.ID),
				SKU:                product.SKU,
				OptimizationStatus: "failed",
				ContentUpdated:     false,
				SEOScoreBefore:     seoBefore,
				SEOScoreAfter:      seoBefore,
				Message:            "Update failed: " + err.Error(),
			})
		}
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Bulk optimization completed",
		Data:    results,
	})
}

// GetOptimizationStatus returns products that need optimization
func (poc *ProductOptimizationController) GetOptimizationStatus(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Database connection failed",
		})
		return
	}

	var stats struct {
		TotalProducts      int64 `json:"total_products"`
		OptimizedProducts  int64 `json:"optimized_products"`
		NeedsOptimization  int64 `json:"needs_optimization"`
		AverageSEOScore    float64 `json:"average_seo_score"`
	}

	// Total products
	db.Model(&models.Product{}).Where("is_active = ?", true).Count(&stats.TotalProducts)

	// Optimized products (within last 30 days)
	db.Model(&models.Product{}).Where("is_active = ? AND last_optimized_at > ?",
		true, time.Now().AddDate(0, 0, -30)).Count(&stats.OptimizedProducts)

	// Needs optimization
	stats.NeedsOptimization = stats.TotalProducts - stats.OptimizedProducts

	// Average SEO score
	var avgResult struct {
		AvgScore float64
	}
	db.Model(&models.Product{}).Where("is_active = ?", true).
		Select("AVG(seo_score) as avg_score").Scan(&avgResult)
	stats.AverageSEOScore = avgResult.AvgScore

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Optimization status retrieved",
		Data:    stats,
	})
}

// calculateSEOScore calculates SEO score based on various factors
func (poc *ProductOptimizationController) calculateSEOScore(product *models.Product) float64 {
	score := 0.0
	maxScore := 10.0

	// Name (1 point)
	if len(product.Name) > 10 && len(product.Name) < 100 {
		score += 1.0
	}

	// Description (2 points)
	if len(product.Description) > 100 {
		score += 1.0
	}
	if len(product.Description) > 300 {
		score += 1.0
	}

	// Meta title (1 point)
	if len(product.MetaTitle) > 20 && len(product.MetaTitle) < 60 {
		score += 1.0
	}

	// Meta description (1 point)
	if len(product.MetaDescription) > 50 && len(product.MetaDescription) < 160 {
		score += 1.0
	}

	// Meta keywords (0.5 points)
	if len(product.MetaKeywords) > 20 {
		score += 0.5
	}

	// Short description (0.5 points)
	if len(product.ShortDescription) > 50 {
		score += 0.5
	}

	// Images (1 point)
	if product.ImageURLs != "" && product.ImageURLs != "[]" {
		score += 1.0
	}

	// Brand and model (1 point)
	if product.Brand != "" && product.Model != "" {
		score += 1.0
	}

	// Technical specs (1 point)
	if product.TechnicalSpecs != "" && product.TechnicalSpecs != "{}" {
		score += 1.0
	}

	// Warranty and certifications (0.5 points)
	if product.WarrantyPeriod != "" || product.Certifications != "" {
		score += 0.5
	}

	// Additional content (0.5 points)
	if product.InstallationGuide != "" || product.MaintenanceTips != "" {
		score += 0.5
	}

	return (score / maxScore) * 5.0 // Scale to 0-5
}

// enhanceProductContent enhances product content if needed
func (poc *ProductOptimizationController) enhanceProductContent(product *models.Product, updateData map[string]interface{}) bool {
	contentUpdated := false

	// Enhance meta title if missing or too short
	if len(product.MetaTitle) < 20 {
		metaTitle := product.Name + " - " + product.SKU + " | Professional FANUC Parts | Vcocnc"
		if len(metaTitle) > 60 {
			metaTitle = product.Name + " - " + product.SKU + " | Vcocnc"
		}
		updateData["meta_title"] = metaTitle
		contentUpdated = true
	}

	// Enhance meta description if missing or too short
	if len(product.MetaDescription) < 50 {
		metaDesc := product.Description
		if len(metaDesc) > 155 {
			metaDesc = metaDesc[:152] + "..."
		}
		if metaDesc == "" {
			metaDesc = product.Name + " (" + product.SKU + ") - Professional FANUC part available at Vcocnc. High-quality industrial automation component with competitive pricing and worldwide shipping."
		}
		updateData["meta_description"] = metaDesc
		contentUpdated = true
	}

	// Enhance meta keywords if missing
	if len(product.MetaKeywords) < 20 {
		keywords := []string{
			product.Name,
			product.SKU,
			"FANUC parts",
			"CNC parts",
			"industrial automation",
		}
		if product.Brand != "" {
			keywords = append(keywords, product.Brand)
		}
		if product.Model != "" {
			keywords = append(keywords, product.Model)
		}
		keywords = append(keywords, "Vcocnc", "spare parts", "replacement parts")

		keywordStr := ""
		for i, kw := range keywords {
			if i > 0 {
				keywordStr += ", "
			}
			keywordStr += kw
		}
		updateData["meta_keywords"] = keywordStr
		contentUpdated = true
	}

	// Enhance short description if missing
	if len(product.ShortDescription) < 50 && len(product.Description) > 0 {
		shortDesc := product.Description
		if len(shortDesc) > 200 {
			shortDesc = shortDesc[:197] + "..."
		}
		updateData["short_description"] = shortDesc
		contentUpdated = true
	}

	// Set default values for new fields if empty
	if product.WarrantyPeriod == "" {
		updateData["warranty_period"] = "12 months"
		contentUpdated = true
	}

	if product.Manufacturer == "" {
		updateData["manufacturer"] = "FANUC"
		contentUpdated = true
	}

	if product.OriginCountry == "" {
		updateData["origin_country"] = "China"
		contentUpdated = true
	}

	if product.LeadTime == "" {
		updateData["lead_time"] = "3-7 days"
		contentUpdated = true
	}

	return contentUpdated
}
