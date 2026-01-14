package controllers

import (
	"net/http"
	"strconv"

	"fanuc-backend/config"
	"fanuc-backend/models"

	"github.com/gin-gonic/gin"
)

// HomepageContentController handles homepage content operations
type HomepageContentController struct{}

// GetHomepageContents retrieves all homepage content sections
func (hc *HomepageContentController) GetHomepageContents(c *gin.Context) {
	var contents []models.HomepageContent

	query := config.DB.Where("is_active = ?", true).Order("sort_order ASC, created_at ASC")

	// Optional section filter
	if sectionKey := c.Query("section_key"); sectionKey != "" {
		query = query.Where("section_key = ?", sectionKey)
	}

	if err := query.Find(&contents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch homepage contents"})
		return
	}

	c.JSON(http.StatusOK, contents)
}

// GetHomepageContent retrieves a single homepage content by ID
func (hc *HomepageContentController) GetHomepageContent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid content ID"})
		return
	}

	var content models.HomepageContent
	if err := config.DB.First(&content, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Homepage content not found"})
		return
	}

	c.JSON(http.StatusOK, content)
}

// CreateHomepageContent creates a new homepage content section
func (hc *HomepageContentController) CreateHomepageContent(c *gin.Context) {
	var req models.HomepageContentCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if section_key already exists
	var existingContent models.HomepageContent
	if err := config.DB.Where("section_key = ?", req.SectionKey).First(&existingContent).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Section key already exists"})
		return
	}

	content := models.HomepageContent{
		SectionKey:  req.SectionKey,
		Title:       req.Title,
		Subtitle:    req.Subtitle,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		ButtonText:  req.ButtonText,
		ButtonURL:   req.ButtonURL,
		SortOrder:   req.SortOrder,
		IsActive:    req.IsActive,
	}

	if err := config.DB.Create(&content).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create homepage content"})
		return
	}

	c.JSON(http.StatusCreated, content)
}

// UpdateHomepageContent updates an existing homepage content section
func (hc *HomepageContentController) UpdateHomepageContent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid content ID"})
		return
	}

	var content models.HomepageContent
	if err := config.DB.First(&content, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Homepage content not found"})
		return
	}

	var req models.HomepageContentUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields if provided
	if req.Title != nil {
		content.Title = *req.Title
	}
	if req.Subtitle != nil {
		content.Subtitle = *req.Subtitle
	}
	if req.Description != nil {
		content.Description = *req.Description
	}
	if req.ImageURL != nil {
		content.ImageURL = *req.ImageURL
	}
	if req.ButtonText != nil {
		content.ButtonText = *req.ButtonText
	}
	if req.ButtonURL != nil {
		content.ButtonURL = *req.ButtonURL
	}
	if req.SortOrder != nil {
		content.SortOrder = *req.SortOrder
	}
	if req.IsActive != nil {
		content.IsActive = *req.IsActive
	}

	if err := config.DB.Save(&content).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update homepage content"})
		return
	}

	c.JSON(http.StatusOK, content)
}

// DeleteHomepageContent deletes a homepage content section
func (hc *HomepageContentController) DeleteHomepageContent(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid content ID"})
		return
	}

	if err := config.DB.Delete(&models.HomepageContent{}, uint(id)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete homepage content"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Homepage content deleted successfully"})
}

// GetPredefinedSections returns the list of predefined homepage sections
func (hc *HomepageContentController) GetPredefinedSections(c *gin.Context) {
	sections := models.GetPredefinedSections()
	c.JSON(http.StatusOK, sections)
}

// GetHomepageContentBySection retrieves homepage content by section key
func (hc *HomepageContentController) GetHomepageContentBySection(c *gin.Context) {
	sectionKey := c.Param("section_key")
	if sectionKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Section key is required"})
		return
	}

	var content models.HomepageContent
	if err := config.DB.Where("section_key = ? AND is_active = ?", sectionKey, true).First(&content).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Homepage content not found"})
		return
	}

	c.JSON(http.StatusOK, content)
}
