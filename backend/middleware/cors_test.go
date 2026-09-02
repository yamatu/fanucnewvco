package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

const validChromeExtensionOrigin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop"

func TestIsChromeExtensionOrigin(t *testing.T) {
	tests := []struct {
		name   string
		origin string
		want   bool
	}{
		{name: "valid", origin: validChromeExtensionOrigin, want: true},
		{name: "uppercase", origin: "chrome-extension://ABCDEFGHIJKLMNOPABCDEFGHIJKLMNOP", want: false},
		{name: "invalid character", origin: "chrome-extension://abcdefghijklmnopabcdefghijklmnoq", want: false},
		{name: "short", origin: "chrome-extension://abcdefghijklmnop", want: false},
		{name: "website", origin: "https://vibocnc.com", want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := isChromeExtensionOrigin(test.origin); got != test.want {
				t.Fatalf("isChromeExtensionOrigin(%q) = %v, want %v", test.origin, got, test.want)
			}
		})
	}
}

func TestCORSMiddlewareAllowsChromeExtensionInProduction(t *testing.T) {
	t.Setenv("GO_ENV", "production")
	t.Setenv("CORS_ORIGINS", "https://vibocnc.com")
	t.Setenv("CORS_ALLOW_CHROME_EXTENSIONS", "true")
	t.Setenv("CORS_EXTENSION_ORIGINS", "")
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORSMiddleware())
	router.POST("/login", func(c *gin.Context) { c.Status(http.StatusOK) })

	request := httptest.NewRequest(http.MethodOptions, "/login", nil)
	request.Header.Set("Origin", validChromeExtensionOrigin)
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	request.Header.Set("Access-Control-Request-Headers", "content-type,authorization")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want %d", recorder.Code, http.StatusNoContent)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != validChromeExtensionOrigin {
		t.Fatalf("allow origin = %q, want %q", got, validChromeExtensionOrigin)
	}
}

func TestCORSMiddlewareRejectsChromeExtensionWhenDisabled(t *testing.T) {
	t.Setenv("GO_ENV", "production")
	t.Setenv("CORS_ORIGINS", "https://vibocnc.com")
	t.Setenv("CORS_ALLOW_CHROME_EXTENSIONS", "false")
	t.Setenv("CORS_EXTENSION_ORIGINS", "")
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORSMiddleware())
	router.GET("/protected", func(c *gin.Context) { c.Status(http.StatusOK) })

	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	request.Header.Set("Origin", validChromeExtensionOrigin)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusForbidden)
	}
}
