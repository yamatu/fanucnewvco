package controllers

import (
	"context"
	"net/http"
	"strings"
	"sync"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
)

const (
	defaultAutoCategoryOptimizationLimit = 50
	maxAutoCategoryOptimizationLimit     = 500
	maxAutoCategoryOptimizationWorkers   = 4
)

type autoCategoryOptimizationRequest struct {
	ProductIDs              []uint `json:"product_ids"`
	CategoryID              *uint  `json:"category_id"`
	Brand                   string `json:"brand"`
	IncludeInactive         bool   `json:"include_inactive"`
	Limit                   int    `json:"limit"`
	AfterID                 uint   `json:"after_id"`
	UseWebSearch            *bool  `json:"use_web_search"`
	CreateMissingCategories bool   `json:"create_missing_categories"`
	ActivateResolved        bool   `json:"activate_resolved"`
}

type autoCategoryOptimizationResponse struct {
	Processed         int                                          `json:"processed"`
	Completed         int                                          `json:"completed"`
	Unresolved        int                                          `json:"unresolved"`
	Failed            int                                          `json:"failed"`
	CategoriesCreated int                                          `json:"categories_created"`
	HasMore           bool                                         `json:"has_more"`
	NextAfterID       uint                                         `json:"next_after_id"`
	Results           []services.ProductCategoryOptimizationResult `json:"results"`
}

// AutoOptimizeProductCategories is the only automatic flow allowed to create
// taxonomy nodes. It is guarded by AdminOnly at the route and only creates a
// type leaf after both brand and product type have been verified.
func (poc *ProductOptimizationController) AutoOptimizeProductCategories(c *gin.Context) {
	var request autoCategoryOptimizationRequest
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
		limit = defaultAutoCategoryOptimizationLimit
	}
	if limit > maxAutoCategoryOptimizationLimit {
		limit = maxAutoCategoryOptimizationLimit
	}

	query := db.Preload("Category").Order("products.id ASC")
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
	if canonicalBrand := services.CanonicalBrandName(request.Brand); canonicalBrand != "" {
		query = query.Where("LOWER(products.brand) = LOWER(?)", canonicalBrand)
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
	useWebSearch := true
	if request.UseWebSearch != nil {
		useWebSearch = *request.UseWebSearch
	}
	opts := services.ProductCategoryOptimizationOptions{
		UseWebSearch:            useWebSearch,
		CreateMissingCategories: request.CreateMissingCategories,
		ActivateResolved:        request.ActivateResolved,
	}

	results := make([]services.ProductCategoryOptimizationResult, len(products))
	requestContext := c.Request.Context()
	workerCount := maxAutoCategoryOptimizationWorkers
	if len(products) < workerCount {
		workerCount = len(products)
	}
	if workerCount > 0 {
		jobs := make(chan int)
		var workers sync.WaitGroup
		for worker := 0; worker < workerCount; worker++ {
			workers.Add(1)
			go func(ctx context.Context) {
				defer workers.Done()
				for index := range jobs {
					if ctx.Err() != nil {
						results[index] = services.ProductCategoryOptimizationResult{
							ProductID: products[index].ID,
							SKU:       products[index].SKU,
							Status:    "failed",
							Message:   ctx.Err().Error(),
						}
						continue
					}
					results[index] = services.OptimizeProductCategory(ctx, db, products[index], opts)
				}
			}(requestContext)
		}
		for index := range products {
			jobs <- index
		}
		close(jobs)
		workers.Wait()
	}

	response := autoCategoryOptimizationResponse{
		Processed:   len(results),
		HasMore:     hasMore,
		Results:     results,
		NextAfterID: request.AfterID,
	}
	for _, result := range results {
		if result.ProductID > response.NextAfterID {
			response.NextAfterID = result.ProductID
		}
		switch strings.ToLower(strings.TrimSpace(result.Status)) {
		case "completed":
			response.Completed++
		case "unresolved":
			response.Unresolved++
		default:
			response.Failed++
		}
		if result.CategoryCreated {
			response.CategoriesCreated++
		}
	}

	if len(results) > 0 {
		go services.InvalidatePublicCaches(context.Background(), "product:auto-optimize-categories", nil)
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Product category optimization batch completed",
		Data:    response,
	})
}
