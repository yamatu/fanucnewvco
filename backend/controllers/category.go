package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"
	"fanuc-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CategoryController struct{}

// GetCategories returns paginated list of categories
func (cc *CategoryController) GetCategories(c *gin.Context) {
	db := config.GetDB()

	flat := c.Query("flat") == "true"
	includeInactive := c.Query("include_inactive") == "true"

	query := db.Model(&models.Category{}).Order("sort_order ASC, name ASC")
	if !includeInactive {
		query = query.Where("is_active = ?", true)
	}

	var cats []models.Category
	if err := query.Find(&cats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database error", Error: err.Error()})
		return
	}

	tree := services.BuildCategoryTree(cats)
	if flat {
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Categories retrieved successfully", Data: services.FlattenCategoryTree(tree)})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Categories retrieved successfully", Data: tree})
}

// GetCategoryByPath resolves a category by nested slug path, e.g. "fanuc-controls/fanuc-power-mate".
// GET /api/v1/public/categories/path/*path
func (cc *CategoryController) GetCategoryByPath(c *gin.Context) {
	path := strings.Trim(c.Param("path"), "/")
	if path == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid path", Error: "empty_path"})
		return
	}

	// Compute paths using one scan of active categories.
	db := config.GetDB()
	var all []models.Category
	if err := db.Model(&models.Category{}).Where("is_active = ?", true).Order("sort_order ASC, name ASC").Find(&all).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database error", Error: err.Error()})
		return
	}
	tree := services.BuildCategoryTree(all)
	flat := services.FlattenCategoryTree(tree)

	byID := make(map[uint]services.CategoryNode, len(flat))
	for _, n := range flat {
		byID[n.ID] = n
	}

	var node *services.CategoryNode
	for i := range flat {
		if flat[i].Path == path {
			node = &flat[i]
			break
		}
	}
	if node == nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Category not found", Error: "category_not_found"})
		return
	}

	// Build breadcrumb by following parent_id chain.
	breadcrumbNodes := make([]services.CategoryNode, 0, 8)
	cur := *node
	for {
		breadcrumbNodes = append(breadcrumbNodes, cur)
		if cur.ParentID == nil {
			break
		}
		p, ok := byID[*cur.ParentID]
		if !ok {
			break
		}
		cur = p
	}
	// reverse
	for i, j := 0, len(breadcrumbNodes)-1; i < j; i, j = i+1, j-1 {
		breadcrumbNodes[i], breadcrumbNodes[j] = breadcrumbNodes[j], breadcrumbNodes[i]
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Category retrieved successfully", Data: gin.H{"category": node, "breadcrumb": breadcrumbNodes}})
}

type reorderCategoryItem struct {
	ID        uint  `json:"id"`
	ParentID  *uint `json:"parent_id"`
	SortOrder int   `json:"sort_order"`
}

// ReorderCategories updates parent_id + sort_order for categories in bulk.
// PUT /api/v1/admin/categories/reorder
func (cc *CategoryController) ReorderCategories(c *gin.Context) {
	var items []reorderCategoryItem
	if err := c.ShouldBindJSON(&items); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request data", Error: err.Error()})
		return
	}
	if len(items) == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request data", Error: "empty_items"})
		return
	}

	db := config.GetDB()
	err := db.Transaction(func(tx *gorm.DB) error {
		for _, it := range items {
			if it.ID == 0 {
				continue
			}
			updates := map[string]any{"sort_order": it.SortOrder, "parent_id": it.ParentID}
			if e := tx.Model(&models.Category{}).Where("id = ?", it.ID).Updates(updates).Error; e != nil {
				return e
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to reorder categories", Error: err.Error()})
		return
	}

	services.InvalidatePublicCaches(c.Request.Context(), "category:reorder", nil)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Categories reordered successfully"})
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

	services.InvalidatePublicCaches(c.Request.Context(), "category:create", nil)

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

	services.InvalidatePublicCaches(c.Request.Context(), "category:update", nil)

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

	services.InvalidatePublicCaches(c.Request.Context(), "category:delete", nil)

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Category deleted successfully",
	})
}
