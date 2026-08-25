package controllers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
)

const (
	defaultTitleStandardizationLimit = 100
	maxTitleStandardizationLimit     = 500
)

type productTitleStandardizationRequest struct {
	ProductIDs      []uint `json:"product_ids"`
	CategoryID      *uint  `json:"category_id"`
	Brand           string `json:"brand"`
	IncludeInactive bool   `json:"include_inactive"`
	Limit           int    `json:"limit"`
	AfterID         uint   `json:"after_id"`
	// Apply writes the proposed names; the default is a read-only preview.
	Apply bool `json:"apply"`
}

type productTitleStandardizationResponse struct {
	Processed   int                             `json:"processed"`
	Ready       int                             `json:"ready"`
	Updated     int                             `json:"updated"`
	Skipped     int                             `json:"skipped"`
	Unresolved  int                             `json:"unresolved"`
	HasMore     bool                            `json:"has_more"`
	NextAfterID uint                            `json:"next_after_id"`
	Applied     bool                            `json:"applied"`
	Results     []services.ProductTitleProposal `json:"results"`
}

// StandardizeProductTitles renames products to the canonical
// "Brand Model Type" pattern derived from verified classification rules.
// Slugs are intentionally left untouched so public URLs keep working.
func (poc *ProductOptimizationController) StandardizeProductTitles(c *gin.Context) {
	var request productTitleStandardizationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database connection failed"})
		return
	}

	limit := request.Limit
	if limit <= 0 {
		limit = defaultTitleStandardizationLimit
	}
	if limit > maxTitleStandardizationLimit {
		limit = maxTitleStandardizationLimit
	}

	query := db.Model(&models.Product{}).Order("products.id ASC")
	if len(request.ProductIDs) > 0 {
		query = query.Where("products.id IN ?", request.ProductIDs)
	}
	if request.CategoryID != nil && *request.CategoryID > 0 {
		query = query.Where("products.category_id = ?", *request.CategoryID)
	}
	if request.AfterID > 0 {
		query = query.Where("products.id > ?", request.AfterID)
	}
	if !request.IncludeInactive {
		query = query.Where("products.is_active = ?", true)
	}
	if brand := strings.TrimSpace(request.Brand); brand != "" {
		query = query.Where("LOWER(products.brand) = LOWER(?)", brand)
	}

	var products []models.Product
	if err := query.Limit(limit + 1).Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to fetch products", Error: err.Error()})
		return
	}
	hasMore := len(products) > limit
	if hasMore {
		products = products[:limit]
	}

	response := productTitleStandardizationResponse{
		HasMore:     hasMore,
		NextAfterID: request.AfterID,
		Applied:     request.Apply,
		Results:     make([]services.ProductTitleProposal, 0, len(products)),
	}
	for _, product := range products {
		proposal := services.ProposeStandardProductTitle(product)
		if product.ID > response.NextAfterID {
			response.NextAfterID = product.ID
		}
		if proposal.Status == "ready" && request.Apply {
			updates := map[string]any{"name": proposal.NewName, "updated_at": time.Now()}
			if brand := strings.TrimSpace(proposal.Brand); brand != "" {
				updates["brand"] = brand
			}
			if err := db.Model(&models.Product{}).Where("id = ?", product.ID).Updates(updates).Error; err != nil {
				proposal.Status = "failed"
				proposal.Message = err.Error()
			} else {
				proposal.Status = "updated"
				response.Updated++
			}
		}
		switch proposal.Status {
		case "ready":
			response.Ready++
		case "skipped":
			response.Skipped++
		case "unresolved":
			response.Unresolved++
		}
		response.Results = append(response.Results, proposal)
	}
	response.Processed = len(response.Results)

	if request.Apply && response.Updated > 0 {
		go services.InvalidatePublicCaches(context.Background(), "product:standardize-titles", nil)
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Product title standardization batch completed",
		Data:    response,
	})
}
