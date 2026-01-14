package middleware

import (
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware configures CORS settings
func CORSMiddleware() gin.HandlerFunc {
	// Get CORS settings from environment
	origins := os.Getenv("CORS_ORIGINS")
	if origins == "" {
		origins = "http://localhost:3000"
	}

	methods := os.Getenv("CORS_METHODS")
	if methods == "" {
		methods = "GET,POST,PUT,DELETE,OPTIONS"
	}

	headers := os.Getenv("CORS_HEADERS")
	if headers == "" {
		headers = "Origin,Content-Type,Accept,Authorization,X-Requested-With"
	}

	config := cors.Config{
		AllowOrigins:     strings.Split(origins, ","),
		AllowMethods:     strings.Split(methods, ","),
		AllowHeaders:     strings.Split(headers, ","),
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	return cors.New(config)
}
