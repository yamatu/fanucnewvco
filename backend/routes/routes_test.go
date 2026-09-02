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
