package controllers

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuthController struct{}

// Login handles user authentication
func (ac *AuthController) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	// Find user by username
	var user models.AdminUser
	db := config.GetDB()
	if err := db.Where("username = ? AND is_active = ?", req.Username, true).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Message: "Invalid username or password",
				Error:   "invalid_credentials",
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

	// Check password
	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Message: "Invalid username or password",
			Error:   "invalid_credentials",
		})
		return
	}

	// Generate JWT token
	token, expiresAt, err := utils.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to generate token",
			Error:   err.Error(),
		})
		return
	}

	// Update last login time
	now := time.Now()
	user.LastLogin = &now
	db.Save(&user)

	// Return response
	response := models.LoginResponse{
		Token:     token,
		User:      user,
		ExpiresAt: expiresAt,
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Login successful",
		Data:    response,
	})
}

// GetProfile returns current user profile
func (ac *AuthController) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Message: "User not authenticated",
			Error:   "not_authenticated",
		})
		return
	}

	var user models.AdminUser
	db := config.GetDB()
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "User not found",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Profile retrieved successfully",
		Data:    user,
	})
}

// UpdateProfile handles user profile update
func (ac *AuthController) UpdateProfile(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		FullName string `json:"full_name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	// Get current user from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// Check if username or email already exists (excluding current user)
	var existingUser models.AdminUser
	if err := config.DB.Where("(username = ? OR email = ?) AND id != ?", req.Username, req.Email, userID).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Username or email already exists",
		})
		return
	}

	// Update user profile
	var user models.AdminUser
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "User not found",
		})
		return
	}

	user.Username = req.Username
	user.Email = req.Email
	user.FullName = req.FullName

	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update profile",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated successfully",
		"data":    user,
	})
}

// ChangePassword handles password change
func (ac *AuthController) ChangePassword(c *gin.Context) {
	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	userID, _ := c.Get("user_id")

	var user models.AdminUser
	db := config.GetDB()
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "User not found",
			Error:   err.Error(),
		})
		return
	}

	// Verify current password
	if !utils.CheckPasswordHash(req.CurrentPassword, user.PasswordHash) {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Current password is incorrect",
			Error:   "invalid_current_password",
		})
		return
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to hash password",
			Error:   err.Error(),
		})
		return
	}

	// Update password
	user.PasswordHash = hashedPassword
	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to update password",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Password changed successfully",
	})
}
