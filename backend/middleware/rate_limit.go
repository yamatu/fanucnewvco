package middleware

import (
	"context"
	"fanuc-backend/config"
	"fanuc-backend/models"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// getClientIP returns a best-effort client IP. We prefer X-Forwarded-For (first value)
// because this service typically sits behind Nginx.
func getClientIP(c *gin.Context) string {
	// Prefer X-Forwarded-For if present
	xff := c.GetHeader("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}
	return c.ClientIP()
}

func getLoginLimitPerMinute() int {
	limit := 10
	if s := strings.TrimSpace(os.Getenv("LOGIN_RATE_LIMIT_PER_MINUTE")); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v > 0 {
			limit = v
		}
	}
	return limit
}

// LoginRateLimitMiddleware limits POST /api/v1/auth/login by client IP.
// Uses Redis INCR+EXPIRE with a 60s fixed window.
// If Redis is not configured, this middleware is a no-op.
func LoginRateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		rdb := config.GetRedis()
		if rdb == nil {
			c.Next()
			return
		}

		if c.Request.Method != http.MethodPost {
			c.Next()
			return
		}

		ip := getClientIP(c)
		// window key includes minute timestamp so it resets naturally.
		now := time.Now().UTC()
		key := "rl:login:" + ip + ":" + now.Format("200601021504")

		ctx, cancel := context.WithTimeout(c.Request.Context(), 200*time.Millisecond)
		defer cancel()

		cnt, err := rdb.Incr(ctx, key).Result()
		if err == nil && cnt == 1 {
			// set TTL only on first hit
			_, _ = rdb.Expire(ctx, key, 70*time.Second).Result()
		}

		limit := int64(getLoginLimitPerMinute())
		if err == nil && cnt > limit {
			c.JSON(http.StatusTooManyRequests, models.APIResponse{
				Success: false,
				Message: "Too many login attempts, please try again later",
				Error:   "rate_limited",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
