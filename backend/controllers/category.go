package controllers

import (
	"net/http"
	"strconv"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CategoryController struct{}

// GetCategories returns paginated list of categories
func (cc *CategoryController) GetCategories(c *gin.Context) {
	db := config.GetDB()

	// Parse query parameters
	flat := c.Query("flat") == "true"
	includeProducts := c.Query("include_products") == "true"

	var categories []models.Category
	query := db.Model(&models.Category{}).Where("is_active = ?", true).Order("sort_order ASC, name ASC")

	if includeProducts {
		query = query.Preload("Products", "is_active = ?", true)
	}

	if flat {
		// Return flat list of categories
		if err := query.Find(&categories).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Success: false,
				Message: "Database error",
				Error:   err.Error(),
			})
			return
		}
	} else {
		// Return hierarchical structure (root categories with children)
		if err := query.Where("parent_id IS NULL").Preload("Children", "is_active = ?", true).Find(&categories).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Success: false,
				Message: "Database error",
				Error:   err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Categories retrieved successfully",
		Data:    categories,
	})
}

// GetCategory returns a single category by ID
func (cc *CategoryController) GetCategory(c *gin.Context) {
	id := c.Param("id")

	var category models.Category
	db := config.GetDB()

	if err := db.Preload("Children", "is_active = ?", true).
		Preload("Products", "is_active = ?", true).
		First(&category, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Message: "Category not found",
				Error:   "category_not_found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Database error",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Category retrieved successfully",
		Data:    category,
	})
}

// GetCategoryBySlug returns a single category by slug
func (cc *CategoryController) GetCategoryBySlug(c *gin.Context) {
	slug := c.Param("slug")

	var category models.Category
	db := config.GetDB()

	if err := db.Where("slug = ? AND is_active = ?", slug, true).
		Preload("Children", "is_active = ?", true).
		Preload("Products", "is_active = ?", true).
		First(&category).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Message: "Category not found",
				Error:   "category_not_found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Database error",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Category retrieved successfully",
		Data:    category,
	})
}

// CreateCategory creates a new category
func (cc *CategoryController) CreateCategory(c *gin.Context) {
	var req models.CategoryCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	db := config.GetDB()

	// Generate slug
	baseSlug := utils.GenerateSlug(req.Name)
	slug := utils.GenerateUniqueSlug(baseSlug, func(s string) bool {
		var count int64
		db.Model(&models.Category{}).Where("slug = ?", s).Count(&count)
		return count > 0
	})

	// Create category
	category := models.Category{
		Name:        req.Name,
		Slug:        slug,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		ParentID:    req.ParentID,
		SortOrder:   req.SortOrder,
		IsActive:    req.IsActive,
	}

	if err := db.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to create category",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Category created successfully",
		Data:    category,
	})
}

// UpdateCategory updates an existing category
func (cc *CategoryController) UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	categoryID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid category ID",
			Error:   "invalid_id",
		})
		return
	}

	var req models.CategoryCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	db := config.GetDB()

	// Find existing category
	var category models.Category
	if err := db.First(&category, uint(categoryID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Message: "Category not found",
				Error:   "category_not_found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Database error",
			Error:   err.Error(),
		})
		return
	}

	// Generate new slug if name changed
	if category.Name != req.Name {
		baseSlug := utils.GenerateSlug(req.Name)
		category.Slug = utils.GenerateUniqueSlug(baseSlug, func(s string) bool {
			var count int64
			db.Model(&models.Category{}).Where("slug = ? AND id != ?", s, category.ID).Count(&count)
			return count > 0
		})
	}

	// Update category
	category.Name = req.Name
	category.Description = req.Description
	category.ImageURL = req.ImageURL
	category.ParentID = req.ParentID
	category.SortOrder = req.SortOrder
	category.IsActive = req.IsActive

	if err := db.Save(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to update category",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Category updated successfully",
		Data:    category,
	})
}

// DeleteCategory deletes a category
func (cc *CategoryController) DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	categoryID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid category ID",
			Error:   "invalid_id",
		})
		return
	}

	db := config.GetDB()

	// Check if category has products
	var productCount int64
	if err := db.Model(&models.Product{}).Where("category_id = ?", uint(categoryID)).Count(&productCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Database error",
			Error:   err.Error(),
		})
		return
	}

	if productCount > 0 {
		c.JSON(http.StatusConflict, models.APIResponse{
			Success: false,
			Message: "Cannot delete category with existing products",
			Error:   "category_has_products",
		})
		return
	}

	// Check if category has children
	var childCount int64
	if err := db.Model(&models.Category{}).Where("parent_id = ?", uint(categoryID)).Count(&childCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Database error",
			Error:   err.Error(),
		})
		return
	}

	if childCount > 0 {
		c.JSON(http.StatusConflict, models.APIResponse{
			Success: false,
			Message: "Cannot delete category with subcategories",
			Error:   "category_has_children",
		})
		return
	}

	// Delete category
	if err := db.Delete(&models.Category{}, uint(categoryID)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to delete category",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Category deleted successfully",
	})
}
