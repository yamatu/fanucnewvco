package controllers

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type PurchaseLinkController struct{}

// GetPurchaseLinks returns all purchase links
func (plc *PurchaseLinkController) GetPurchaseLinks(c *gin.Context) {
	var purchaseLinks []models.PurchaseLink
	db := config.GetDB()

	// Get query parameters for filtering
	productID := c.Query("product_id")
	platform := c.Query("platform")
	isActive := c.Query("is_active")

	query := db.Model(&models.PurchaseLink{})

	// Apply filters
	if productID != "" {
		query = query.Where("product_id = ?", productID)
	}

	if platform != "" {
		query = query.Where("platform LIKE ?", "%"+platform+"%")
	}

	if isActive != "" {
		if isActive == "true" {
			query = query.Where("is_active = ?", true)
		} else if isActive == "false" {
			query = query.Where("is_active = ?", false)
		}
	}

	// Execute query
	if err := query.Order("sort_order ASC, created_at DESC").Find(&purchaseLinks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to retrieve purchase links",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Purchase links retrieved successfully",
		Data:    purchaseLinks,
	})
}

// GetPurchaseLink returns a single purchase link by ID
func (plc *PurchaseLinkController) GetPurchaseLink(c *gin.Context) {
	id := c.Param("id")
	linkID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid purchase link ID",
			Error:   "invalid_id",
		})
		return
	}

	var purchaseLink models.PurchaseLink
	db := config.GetDB()
	if err := db.First(&purchaseLink, uint(linkID)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Purchase link not found",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Purchase link retrieved successfully",
		Data:    purchaseLink,
	})
}

// CreatePurchaseLink creates a new purchase link
func (plc *PurchaseLinkController) CreatePurchaseLink(c *gin.Context) {
	var req struct {
		ProductID   uint     `json:"product_id" binding:"required"`
		Platform    string   `json:"platform" binding:"required"`
		URL         string   `json:"url" binding:"required"`
		Price       *float64 `json:"price"`
		Currency    string   `json:"currency"`
		IsActive    bool     `json:"is_active"`
		SortOrder   int      `json:"sort_order"`
		Description string   `json:"description"`
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

	// Verify product exists
	var product models.Product
	if err := db.First(&product, req.ProductID).Error; err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Product not found",
			Error:   "invalid_product_id",
		})
		return
	}

	// Create purchase link
	purchaseLink := models.PurchaseLink{
		ProductID:   req.ProductID,
		Platform:    req.Platform,
		URL:         req.URL,
		Price:       req.Price,
		Currency:    req.Currency,
		IsActive:    req.IsActive,
		SortOrder:   req.SortOrder,
		Description: req.Description,
	}

	if purchaseLink.Currency == "" {
		purchaseLink.Currency = "USD"
	}

	if err := db.Create(&purchaseLink).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to create purchase link",
			Error:   err.Error(),
		})
		return
	}

	// Reload the purchase link
	db.First(&purchaseLink, purchaseLink.ID)

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Purchase link created successfully",
		Data:    purchaseLink,
	})
}

// UpdatePurchaseLink updates an existing purchase link
func (plc *PurchaseLinkController) UpdatePurchaseLink(c *gin.Context) {
	id := c.Param("id")
	linkID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid purchase link ID",
			Error:   "invalid_id",
		})
		return
	}

	var req struct {
		ProductID   uint     `json:"product_id" binding:"required"`
		Platform    string   `json:"platform" binding:"required"`
		URL         string   `json:"url" binding:"required"`
		Price       *float64 `json:"price"`
		Currency    string   `json:"currency"`
		IsActive    bool     `json:"is_active"`
		SortOrder   int      `json:"sort_order"`
		Description string   `json:"description"`
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

	// Find existing purchase link
	var purchaseLink models.PurchaseLink
	if err := db.First(&purchaseLink, uint(linkID)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Purchase link not found",
			Error:   err.Error(),
		})
		return
	}

	// Verify product exists
	var product models.Product
	if err := db.First(&product, req.ProductID).Error; err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Product not found",
			Error:   "invalid_product_id",
		})
		return
	}

	// Update purchase link fields
	purchaseLink.ProductID = req.ProductID
	purchaseLink.Platform = req.Platform
	purchaseLink.URL = req.URL
	purchaseLink.Price = req.Price
	purchaseLink.Currency = req.Currency
	purchaseLink.IsActive = req.IsActive
	purchaseLink.SortOrder = req.SortOrder
	purchaseLink.Description = req.Description

	if purchaseLink.Currency == "" {
		purchaseLink.Currency = "USD"
	}

	if err := db.Save(&purchaseLink).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to update purchase link",
			Error:   err.Error(),
		})
		return
	}

	// Reload the purchase link
	db.First(&purchaseLink, purchaseLink.ID)

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Purchase link updated successfully",
		Data:    purchaseLink,
	})
}

// DeletePurchaseLink deletes a purchase link
func (plc *PurchaseLinkController) DeletePurchaseLink(c *gin.Context) {
	id := c.Param("id")
	linkID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid purchase link ID",
			Error:   "invalid_id",
		})
		return
	}

	db := config.GetDB()

	// Find purchase link
	var purchaseLink models.PurchaseLink
	if err := db.First(&purchaseLink, uint(linkID)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Purchase link not found",
			Error:   err.Error(),
		})
		return
	}

	// Delete purchase link
	if err := db.Delete(&purchaseLink).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to delete purchase link",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Purchase link deleted successfully",
		Data:    nil,
	})
}
