package main

import (
	"fanuc-backend/config"
	"fanuc-backend/middleware"
	"fanuc-backend/routes"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables based on environment
	env := os.Getenv("GO_ENV")
	if env == "" {
		env = "development"
	}

	var envFile string
	switch env {
	case "production":
		envFile = ".env.production"
	case "development":
		envFile = ".env"
	default:
		envFile = ".env"
	}

	if err := godotenv.Load(envFile); err != nil {
		log.Printf("Warning: %s file not found, trying .env", envFile)
		if err := godotenv.Load(); err != nil {
			log.Println("Warning: .env file not found, using system environment variables")
		}
	}

	log.Printf("Loaded environment from: %s", envFile)

	// Connect to database
	config.ConnectDatabase()

	// Set Gin mode
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "debug"
	}
	gin.SetMode(ginMode)

	// Create Gin router
	r := gin.New()
	// Allow larger multipart uploads (e.g. backup ZIP restore). Files are spooled to disk when exceeding this.
	r.MaxMultipartMemory = 256 << 20 // 256 MiB

	// Add middleware
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORSMiddleware())

	// Setup routes
	routes.SetupRoutes(r)

	// Get host and port from environment
	host := os.Getenv("HOST")
	if host == "" {
		host = "127.0.0.1"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	address := host + ":" + port

	// Start server
	log.Printf("Starting FANUC Backend API server on %s", address)
	log.Printf("Backend will be accessible at: http://%s", address)
	if err := r.Run(address); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
