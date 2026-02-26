package middleware

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
)

// skipPrefixes lists URL path prefixes that should NOT be tracked.
var skipPrefixes = []string{
	"/uploads/",
	"/health",
	"/api/v1/admin/",
	"/api/v1/auth/",
	"/_next/",
	"/favicon",
}

// skipExtensions lists file extensions that indicate static assets.
var skipExtensions = []string{
	".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg",
	".ico", ".woff", ".woff2", ".ttf", ".eot", ".map",
	".webp", ".avif", ".mp4", ".webm",
}

// shouldSkipTracking returns true if the request should not be logged.
func shouldSkipTracking(urlPath string) bool {
	for _, prefix := range skipPrefixes {
		if strings.HasPrefix(urlPath, prefix) {
			return true
		}
	}
	ext := strings.ToLower(path.Ext(urlPath))
	for _, skipExt := range skipExtensions {
		if ext == skipExt {
			return true
		}
	}
	return false
}

// isPrivateIP returns true for loopback, link-local, and RFC-1918 addresses.
func isPrivateIP(ip string) bool {
	if ip == "" || ip == "127.0.0.1" || ip == "::1" || ip == "0.0.0.0" {
		return true
	}
	if strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") {
		return true
	}
	// 172.16.0.0 – 172.31.255.255
	if strings.HasPrefix(ip, "172.") {
		parts := strings.SplitN(ip, ".", 3)
		if len(parts) >= 2 {
			var second int
			for _, ch := range parts[1] {
				if ch >= '0' && ch <= '9' {
					second = second*10 + int(ch-'0')
				} else {
					break
				}
			}
			if second >= 16 && second <= 31 {
				return true
			}
		}
	}
	// fe80:: link-local, fc00::/7 unique-local
	lower := strings.ToLower(ip)
	if strings.HasPrefix(lower, "fe80:") || strings.HasPrefix(lower, "fc") || strings.HasPrefix(lower, "fd") {
		return true
	}
	return false
}

// AnalyticsMiddleware records page visits in a non-blocking goroutine.
// It captures request data before c.Next() and writes the log asynchronously.
// Private/internal IPs are silently skipped.
func AnalyticsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		urlPath := c.Request.URL.Path

		if shouldSkipTracking(urlPath) {
			c.Next()
			return
		}

		// Capture data before handler runs
		ip := GetClientIP(c)

		// Skip private/internal IPs entirely – only track public visitors
		if isPrivateIP(ip) {
			c.Next()
			return
		}

		ua := c.GetHeader("User-Agent")
		method := c.Request.Method
		referer := c.GetHeader("Referer")

		c.Next()

		statusCode := c.Writer.Status()

		// Non-blocking: write the log record in background
		go func() {
			db := config.GetDB()
			if db == nil {
				return
			}

			// Check if tracking is enabled
			s, err := services.GetOrCreateAnalyticsSetting(db)
			if err != nil || !s.TrackingEnabled {
				return
			}

			isBot, botName := services.DetectBot(ua)
			geo := services.LookupGeoIP(ip)

			log := models.VisitorLog{
				IPAddress:   ip,
				Country:     geo.Country,
				CountryCode: geo.CountryCode,
				Region:      geo.RegionName,
				City:        geo.City,
				Latitude:    geo.Lat,
				Longitude:   geo.Lon,
				Path:        urlPath,
				Method:      method,
				StatusCode:  statusCode,
				UserAgent:   ua,
				IsBot:       isBot,
				BotName:     botName,
				Referer:     referer,
			}
			_ = db.Create(&log).Error
		}()
	}
}
