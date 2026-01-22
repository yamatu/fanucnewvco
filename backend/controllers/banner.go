package controllers

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type BannerController struct{}

// GetBanners returns all banners
func (bc *BannerController) GetBanners(c *gin.Context) {
	var banners []models.Banner
	db := config.GetDB()

	// Get query parameters for filtering
	isActive := c.Query("is_active")

	query := db.Model(&models.Banner{})

	// Apply filters
	if isActive != "" {
		if isActive == "true" {
			query = query.Where("is_active = ?", true)
		} else if isActive == "false" {
			query = query.Where("is_active = ?", false)
		}
	}

	// Execute query
	if err := query.Order("sort_order ASC, created_at DESC").Find(&banners).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to retrieve banners",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Banners retrieved successfully",
		Data:    banners,
	})
}

// GetPublicBanners returns active banners for public access
func (bc *BannerController) GetPublicBanners(c *gin.Context) {
	var banners []models.Banner
	db := config.GetDB()

	// Get query parameters for filtering
	isActive := c.Query("is_active")
	contentType := c.Query("content_type")

	query := db.Model(&models.Banner{}).Where("is_active = ?", true)

	// Apply additional filters
	if isActive == "false" {
		// For public API, we only show active banners, ignore false filter
		query = query.Where("is_active = ?", true)
	}

	if contentType != "" {
		query = query.Where("content_type = ?", contentType)
	}

	// Order by sort_order and created_at
	query = query.Order("sort_order ASC, created_at DESC")

	if err := query.Find(&banners).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Database error",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Public banners retrieved successfully",
		Data:    banners,
	})
}

// GetBanner returns a single banner by ID
func (bc *BannerController) GetBanner(c *gin.Context) {
	id := c.Param("id")
	bannerID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid banner ID",
			Error:   "invalid_id",
		})
		return
	}

	var banner models.Banner
	db := config.GetDB()
	if err := db.First(&banner, uint(bannerID)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Banner not found",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Banner retrieved successfully",
		Data:    banner,
	})
}

// CreateBanner creates a new banner
func (bc *BannerController) CreateBanner(c *gin.Context) {
	var req struct {
		Title       string `json:"title" binding:"required"`
		Subtitle    string `json:"subtitle"`
		ImageURL    string `json:"image_url" binding:"required"`
		LinkURL     string `json:"link_url"`
		ContentType string `json:"content_type"`
		CategoryKey string `json:"category_key"`
		SortOrder   int    `json:"sort_order"`
		IsActive    bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	db := config.GetDB()

	// Set default content type if not provided
	contentType := req.ContentType
	if contentType == "" {
		contentType = "hero"
	}

	// Create banner
	banner := models.Banner{
		Title:       req.Title,
		Subtitle:    req.Subtitle,
		ImageURL:    req.ImageURL,
		LinkURL:     req.LinkURL,
		ContentType: contentType,
		CategoryKey: req.CategoryKey,
		SortOrder:   req.SortOrder,
		IsActive:    req.IsActive,
	}

	if err := db.Create(&banner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to create banner",
			Error:   err.Error(),
		})
		return
	}

	services.InvalidatePublicCaches(c.Request.Context(), "banner:create", nil)

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Banner created successfully",
		Data:    banner,
	})
}

// UpdateBanner updates an existing banner
func (bc *BannerController) UpdateBanner(c *gin.Context) {
	id := c.Param("id")
	bannerID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid banner ID",
			Error:   "invalid_id",
		})
		return
	}

	var req struct {
		Title       string `json:"title" binding:"required"`
		Subtitle    string `json:"subtitle"`
		ImageURL    string `json:"image_url" binding:"required"`
		LinkURL     string `json:"link_url"`
		ContentType string `json:"content_type"`
		CategoryKey string `json:"category_key"`
		SortOrder   int    `json:"sort_order"`
		IsActive    bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	db := config.GetDB()

	// Find existing banner
	var banner models.Banner
	if err := db.First(&banner, uint(bannerID)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Banner not found",
			Error:   err.Error(),
		})
		return
	}

	// Set default content type if not provided
	contentType := req.ContentType
	if contentType == "" {
		contentType = "hero"
	}

	// Update banner fields
	banner.Title = req.Title
	banner.Subtitle = req.Subtitle
	banner.ImageURL = req.ImageURL
	banner.LinkURL = req.LinkURL
	banner.ContentType = contentType
	banner.CategoryKey = req.CategoryKey
	banner.SortOrder = req.SortOrder
	banner.IsActive = req.IsActive

	if err := db.Save(&banner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to update banner",
			Error:   err.Error(),
		})
		return
	}

	services.InvalidatePublicCaches(c.Request.Context(), "banner:update", nil)

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Banner updated successfully",
		Data:    banner,
	})
}

// DeleteBanner deletes a banner (admin only)
func (bc *BannerController) DeleteBanner(c *gin.Context) {
	id := c.Param("id")
	bannerID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid banner ID",
			Error:   "invalid_id",
		})
		return
	}

	db := config.GetDB()

	// Find banner
	var banner models.Banner
	if err := db.First(&banner, uint(bannerID)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Banner not found",
			Error:   err.Error(),
		})
		return
	}

	// Delete banner
	if err := db.Delete(&banner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to delete banner",
			Error:   err.Error(),
		})
		return
	}

	services.InvalidatePublicCaches(c.Request.Context(), "banner:delete", nil)

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Banner deleted successfully",
		Data:    nil,
	})
}

// UpdateBannerOrder updates banner sort order
func (bc *BannerController) UpdateBannerOrder(c *gin.Context) {
	id := c.Param("id")
	bannerID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid banner ID",
			Error:   "invalid_id",
		})
		return
	}

	var req struct {
		SortOrder int `json:"sort_order" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	db := config.GetDB()

	// Update banner sort order
	if err := db.Model(&models.Banner{}).Where("id = ?", uint(bannerID)).Update("sort_order", req.SortOrder).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to update banner order",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Banner order updated successfully",
		Data:    nil,
	})
}
