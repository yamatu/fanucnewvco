package controllers

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type UserController struct{}

// GetUsers returns all admin users
func (uc *UserController) GetUsers(c *gin.Context) {
	var users []models.AdminUser
	db := config.GetDB()

	// Get query parameters for filtering
	search := c.Query("search")
	role := c.Query("role")
	isActive := c.Query("is_active")

	query := db.Model(&models.AdminUser{})

	// Apply filters
	if search != "" {
		query = query.Where("username LIKE ? OR email LIKE ? OR full_name LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if role != "" {
		query = query.Where("role = ?", role)
	}

	if isActive != "" {
		if isActive == "true" {
			query = query.Where("is_active = ?", true)
		} else if isActive == "false" {
			query = query.Where("is_active = ?", false)
		}
	}

	// Execute query
	if err := query.Order("created_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to retrieve users",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Users retrieved successfully",
		Data:    users,
	})
}

// GetUser returns a single user by ID
func (uc *UserController) GetUser(c *gin.Context) {
	id := c.Param("id")
	userID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid user ID",
			Error:   "invalid_id",
		})
		return
	}

	var user models.AdminUser
	db := config.GetDB()
	if err := db.First(&user, uint(userID)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "User not found",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "User retrieved successfully",
		Data:    user,
	})
}

// CreateUser creates a new admin user
func (uc *UserController) CreateUser(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		FullName string `json:"full_name" binding:"required"`
		Role     string `json:"role" binding:"required,oneof=admin editor viewer"`
		IsActive bool   `json:"is_active"`
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

	// Check if username or email already exists
	var existingUser models.AdminUser
	if err := db.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, models.APIResponse{
			Success: false,
			Message: "Username or email already exists",
			Error:   "user_exists",
		})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to hash password",
			Error:   err.Error(),
		})
		return
	}

	// Create user
	user := models.AdminUser{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FullName:     req.FullName,
		Role:         req.Role,
		IsActive:     req.IsActive,
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to create user",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "User created successfully",
		Data:    user,
	})
}

// UpdateUser updates an existing user
func (uc *UserController) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	userID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid user ID",
			Error:   "invalid_id",
		})
		return
	}

	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		FullName string `json:"full_name" binding:"required"`
		Role     string `json:"role" binding:"required,oneof=admin editor viewer"`
		IsActive bool   `json:"is_active"`
		Password string `json:"password"` // Optional - only if changing password
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

	// Find existing user
	var user models.AdminUser
	if err := db.First(&user, uint(userID)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "User not found",
			Error:   err.Error(),
		})
		return
	}

	// Check if username or email already exists (excluding current user)
	var existingUser models.AdminUser
	if err := db.Where("(username = ? OR email = ?) AND id != ?", req.Username, req.Email, userID).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, models.APIResponse{
			Success: false,
			Message: "Username or email already exists",
			Error:   "user_exists",
		})
		return
	}

	// Safety checks
	if currentUserIDAny, ok := c.Get("user_id"); ok {
		if currentUserID, ok2 := currentUserIDAny.(uint); ok2 {
			// Avoid locking yourself out.
			if user.ID == currentUserID {
				if !req.IsActive {
					c.JSON(http.StatusForbidden, models.APIResponse{
						Success: false,
						Message: "Cannot deactivate your own account",
						Error:   "cannot_deactivate_self",
					})
					return
				}
				if req.Role != "admin" {
					c.JSON(http.StatusForbidden, models.APIResponse{
						Success: false,
						Message: "Cannot change your own role",
						Error:   "cannot_change_own_role",
					})
					return
				}
			}
		}
	}

	// Ensure we never end up with zero active admins
	if user.Role == "admin" && !req.IsActive {
		var activeAdmins int64
		if err := db.Model(&models.AdminUser{}).
			Where("role = ?", "admin").
			Where("is_active = ?", true).
			Where("id <> ?", user.ID).
			Count(&activeAdmins).Error; err == nil {
			if activeAdmins == 0 {
				c.JSON(http.StatusForbidden, models.APIResponse{
					Success: false,
					Message: "Cannot deactivate the last active admin",
					Error:   "cannot_deactivate_last_admin",
				})
				return
			}
		}
	}

	// Update user fields
	user.Username = req.Username
	user.Email = req.Email
	user.FullName = req.FullName
	user.Role = req.Role
	user.IsActive = req.IsActive

	// Update password if provided
	if req.Password != "" {
		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Success: false,
				Message: "Failed to hash password",
				Error:   err.Error(),
			})
			return
		}
		user.PasswordHash = hashedPassword
	}

	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to update user",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "User updated successfully",
		Data:    user,
	})
}

// DeleteUser deletes a user (admin only)
func (uc *UserController) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	userID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid user ID",
			Error:   "invalid_id",
		})
		return
	}

	db := config.GetDB()

	// Find user
	var user models.AdminUser
	if err := db.First(&user, uint(userID)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "User not found",
			Error:   err.Error(),
		})
		return
	}

	// Prevent deleting yourself and prevent removing the last active admin.
	if currentUserIDAny, ok := c.Get("user_id"); ok {
		if currentUserID, ok2 := currentUserIDAny.(uint); ok2 {
			if user.ID == currentUserID {
				c.JSON(http.StatusForbidden, models.APIResponse{
					Success: false,
					Message: "Cannot delete your own account",
					Error:   "cannot_delete_self",
				})
				return
			}
		}
	}

	if user.Role == "admin" && user.IsActive {
		var activeAdmins int64
		if err := db.Model(&models.AdminUser{}).
			Where("role = ?", "admin").
			Where("is_active = ?", true).
			Where("id <> ?", user.ID).
			Count(&activeAdmins).Error; err == nil {
			if activeAdmins == 0 {
				c.JSON(http.StatusForbidden, models.APIResponse{
					Success: false,
					Message: "Cannot delete the last active admin",
					Error:   "cannot_delete_last_admin",
				})
				return
			}
		}
	}

	// Delete user
	if err := db.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to delete user",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "User deleted successfully",
		Data:    nil,
	})
}
