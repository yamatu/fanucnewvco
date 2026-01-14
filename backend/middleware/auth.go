package middleware

import (
	"fanuc-backend/models"
	"fanuc-backend/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT token and sets user context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Message: "Authorization header required",
				Error:   "missing_auth_header",
			})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Message: "Invalid authorization header format",
				Error:   "invalid_auth_format",
			})
			c.Abort()
			return
		}

		token := tokenParts[1]
		claims, err := utils.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Message: "Invalid or expired token",
				Error:   err.Error(),
			})
			c.Abort()
			return
		}

		// Set user information in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// RequireRole middleware checks if user has required role
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, models.APIResponse{
				Success: false,
				Message: "User role not found",
				Error:   "missing_role",
			})
			c.Abort()
			return
		}

		roleStr := userRole.(string)
		for _, role := range roles {
			if roleStr == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, models.APIResponse{
			Success: false,
			Message: "Insufficient permissions",
			Error:   "insufficient_permissions",
		})
		c.Abort()
	}
}

// AdminOnly middleware allows only admin users
func AdminOnly() gin.HandlerFunc {
	return RequireRole("admin")
}

// EditorOrAdmin middleware allows editor and admin users
func EditorOrAdmin() gin.HandlerFunc {
	return RequireRole("admin", "editor")
}

// CustomerAuthMiddleware validates customer JWT token and sets customer context
func CustomerAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Message: "Authorization header required",
				Error:   "missing_auth_header",
			})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Message: "Invalid authorization header format",
				Error:   "invalid_auth_format",
			})
			c.Abort()
			return
		}

		token := tokenParts[1]
		claims, err := utils.ValidateCustomerToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Message: "Invalid or expired token",
				Error:   err.Error(),
			})
			c.Abort()
			return
		}

		// Set customer information in context
		c.Set("customer_id", claims.CustomerID)
		c.Set("customer_email", claims.Email)

		c.Next()
	}
}
