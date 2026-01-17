package middleware

import (
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func splitAndTrimCSV(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		out = append(out, p)
	}
	return out
}

// CORSMiddleware configures CORS settings
func CORSMiddleware() gin.HandlerFunc {
	// Get CORS settings from environment
	origins := os.Getenv("CORS_ORIGINS")
	if origins == "" {
		// Sensible local defaults; can be overridden via CORS_ORIGINS.
		origins = "http://localhost:3000,http://localhost:3006,http://127.0.0.1:3000,http://127.0.0.1:3006"
	}

	methods := os.Getenv("CORS_METHODS")
	if methods == "" {
		methods = "GET,POST,PUT,DELETE,OPTIONS"
	}

	headers := os.Getenv("CORS_HEADERS")
	if headers == "" {
		headers = "Origin,Content-Type,Accept,Authorization,X-Requested-With"
	}

	originList := splitAndTrimCSV(origins)
	methodList := splitAndTrimCSV(methods)
	headerList := splitAndTrimCSV(headers)

	// For local development, be forgiving about origins to prevent confusing 403s in the browser.
	// This still keeps production restricted via explicit CORS_ORIGINS.
	goEnv := strings.ToLower(strings.TrimSpace(os.Getenv("GO_ENV")))
	isDev := goEnv != "production"
	allowAll := false
	for _, o := range originList {
		if o == "*" {
			allowAll = true
			break
		}
	}

	config := cors.Config{
		AllowOrigins:     originList,
		AllowMethods:     methodList,
		AllowHeaders:     headerList,
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	if allowAll {
		// With credentials, we can't use "*" as a literal allowed origin; instead echo the request origin.
		config.AllowOrigins = nil
		config.AllowOriginFunc = func(origin string) bool { return true }
	} else if isDev {
		// Allow typical local origins even if CORS_ORIGINS is misconfigured.
		// This prevents "works in curl, fails in browser with 403" during iterative setup.
		allowed := map[string]struct{}{}
		for _, o := range originList {
			allowed[o] = struct{}{}
		}
		config.AllowOriginFunc = func(origin string) bool {
			if origin == "" {
				return true
			}
			if _, ok := allowed[origin]; ok {
				return true
			}
			// Accept localhost / loopback on any port in dev.
			if strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:") || strings.HasPrefix(origin, "http://0.0.0.0:") {
				return true
			}
			if strings.HasPrefix(origin, "https://localhost:") || strings.HasPrefix(origin, "https://127.0.0.1:") || strings.HasPrefix(origin, "https://0.0.0.0:") {
				return true
			}
			return false
		}
	}

	return cors.New(config)
}
