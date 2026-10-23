package controllers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"fanuc-backend/config"
	"fanuc-backend/models"

	"github.com/gin-gonic/gin"
)

// ProductSitemapMaxPageSize bounds one sitemap shard. The storefront requests
// 1000 per shard; anything above this limit is rejected instead of silently
// falling back to a smaller page, which would shift every shard.
const ProductSitemapMaxPageSize = 5000

type productSitemapEntry struct {
	SKU           string    `json:"sku"`
	UpdatedAt     time.Time `json:"updated_at"`
	StockQuantity int       `json:"stock_quantity"`
	IsFeatured    bool      `json:"is_featured"`
}

func parseSitemapPagination(c *gin.Context) (page int, pageSize int, ok bool) {
	page = 1
	pageSize = 1000
	if raw := strings.TrimSpace(c.Query("page")); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil || v < 1 {
			return 0, 0, false
		}
		page = v
	}
	if raw := strings.TrimSpace(c.Query("page_size")); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil || v < 1 || v > ProductSitemapMaxPageSize {
			return 0, 0, false
		}
		pageSize = v
	}
	return page, pageSize, true
}

// GetProductSitemapEntries returns only the fields the XML sitemaps need for
// every active, indexable product. Ordering by id keeps shard membership stable as new
// products are appended.
// GET /api/v1/public/products/sitemap?page=1&page_size=1000
func (pc *ProductController) GetProductSitemapEntries(c *gin.Context) {
	page, pageSize, ok := parseSitemapPagination(c)
	if !ok {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid page or page_size", Error: "page_size must be between 1 and " + strconv.Itoa(ProductSitemapMaxPageSize)})
		return
	}

	db := config.GetDB()
	var total int64
	if err := db.Model(&models.Product{}).Where("is_active = ? AND seo_noindex = ?", true, false).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database error", Error: err.Error()})
		return
	}

	entries := make([]productSitemapEntry, 0, pageSize)
	// Page through the covering index first, then read only this shard's rows;
	// a plain OFFSET reads every skipped row (1.4s for deep shards).
	shardIDs := db.Model(&models.Product{}).
		Select("id").
		Where("is_active = ? AND seo_noindex = ?", true, false).
		Order("id ASC").
		Offset((page - 1) * pageSize).
		Limit(pageSize)
	if err := db.Table("products AS p").
		Select("p.sku, p.updated_at, p.stock_quantity, p.is_featured").
		Joins("JOIN (?) AS shard ON shard.id = p.id", shardIDs).
		Order("p.id ASC").
		Scan(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database error", Error: err.Error()})
		return
	}

	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "OK",
		Data: models.PaginationResponse{
			Data:       entries,
			Page:       page,
			PageSize:   pageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}
