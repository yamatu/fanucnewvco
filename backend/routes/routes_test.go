package routes

import (
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSetupRoutesAcceptsCategoryImpactRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	SetupRoutes(router)

	found := false
	for _, route := range router.Routes() {
		if route.Method == "GET" && route.Path == "/api/v1/admin/categories/:id/deletion-impact" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("category deletion-impact route was not registered")
	}
}

func TestSetupRoutesRegistersProductCatalogTransferRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	SetupRoutes(router)

	wanted := map[string]bool{
		"GET /api/v1/admin/backup/products/export":                    false,
		"POST /api/v1/admin/backup/products/import/jobs":              false,
		"PUT /api/v1/admin/backup/products/import/jobs/:id/chunk":     false,
		"POST /api/v1/admin/backup/products/import/jobs/:id/complete": false,
		"GET /api/v1/admin/backup/products/import/jobs/:id":           false,
		"GET /api/v1/admin/backup/products/import/jobs/:id/preview":   false,
		"POST /api/v1/admin/backup/products/import/jobs/:id/apply":    false,
		"POST /api/v1/admin/backup/products/import/jobs/:id/pause":    false,
		"POST /api/v1/admin/backup/products/import/jobs/:id/resume":   false,
		"DELETE /api/v1/admin/backup/products/import/jobs/:id":        false,
	}
	for _, route := range router.Routes() {
		key := route.Method + " " + route.Path
		if _, exists := wanted[key]; exists {
			wanted[key] = true
		}
	}
	for route, found := range wanted {
		if !found {
			t.Fatalf("product catalog transfer route was not registered: %s", route)
		}
	}
}
