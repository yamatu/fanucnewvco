package middleware

import (
	"fanuc-backend/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

// OptionalCustomerAuth tries to authenticate customer but allows request to continue even if not authenticated
// This is useful for public endpoints that want to associate data with logged-in customers if available
func OptionalCustomerAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No auth header, continue without setting customer_id
			c.Next()
			return
		}

		// Extract token from "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			// Invalid format, continue without setting customer_id
			c.Next()
			return
		}

		token := tokenParts[1]
		claims, err := utils.ValidateCustomerToken(token)
		if err != nil {
			// Invalid token, continue without setting customer_id
			c.Next()
			return
		}

		// Set customer information in context
		c.Set("customer_id", claims.CustomerID)
		c.Set("customer_email", claims.Email)

		c.Next()
	}
}
