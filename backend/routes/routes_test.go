package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// Compiling handlers does not detect duplicate Gin routes. Exercise the real
// router registration so startup panics fail the test before deployment.
func TestSetupRoutesAndHealth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	SetupRoutes(router)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/health", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("health status = %d, body = %s", response.Code, response.Body.String())
	}
}

// Admin pages call these endpoints; a handler without a registered route
// surfaces in the UI as a bare "Request failed with status code 404".
func TestSetupRoutesRegistersAdminEndpointsUsedByFrontend(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	SetupRoutes(router)

	want := map[string]bool{
		"POST /api/v1/admin/ebay-import-drafts/selection-ids":  false,
		"POST /api/v1/admin/ebay-import-drafts/bulk-delete":    false,
		"GET /api/v1/admin/products/bulk-default-image/brands": false,
		"GET /api/v1/admin/shipping-rates/world-countries":     false,
		"PUT /api/v1/admin/shipping-rates/country/:code":       false,
	}
	for _, route := range router.Routes() {
		key := route.Method + " " + route.Path
		if _, ok := want[key]; ok {
			want[key] = true
		}
	}
	for route, found := range want {
		if !found {
			t.Errorf("route not registered: %s", route)
		}
	}
}
