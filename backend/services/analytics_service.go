package services

import (
	"encoding/json"
	"errors"
	"fanuc-backend/config"
	"fanuc-backend/models"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// GeoIP lookup (ip-api.com with in-memory cache)
// ---------------------------------------------------------------------------

// GeoIPResult holds the subset of fields we need from ip-api.com.
type GeoIPResult struct {
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	RegionName  string  `json:"regionName"`
	City        string  `json:"city"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
}

type geoIPCacheEntry struct {
	result    *GeoIPResult
	expiresAt time.Time
}

var (
	geoCache   = make(map[string]*geoIPCacheEntry)
	geoCacheMu sync.RWMutex
	// Semaphore channel limits outbound ip-api requests (~40/min free tier).
	geoSem = make(chan struct{}, 2)
)

const geoCacheTTL = 24 * time.Hour

// LookupGeoIP returns geo information for an IP. Results are cached for 24h.
// On error it returns an empty result (caller can still create the log).
func LookupGeoIP(ip string) *GeoIPResult {
	// Skip private / loopback addresses
	if ip == "" || ip == "127.0.0.1" || ip == "::1" || strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") || strings.HasPrefix(ip, "172.") {
		return &GeoIPResult{}
	}

	// Check cache
	geoCacheMu.RLock()
	if entry, ok := geoCache[ip]; ok && time.Now().Before(entry.expiresAt) {
		geoCacheMu.RUnlock()
		return entry.result
	}
	geoCacheMu.RUnlock()

	// Rate-limit outbound requests
	select {
	case geoSem <- struct{}{}:
	default:
		// Too many concurrent lookups; return empty
		return &GeoIPResult{}
	}
	defer func() { <-geoSem }()

	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,country,countryCode,regionName,city,lat,lon", ip)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		log.Printf("geoip lookup failed for %s: %v", ip, err)
		return &GeoIPResult{}
	}
	defer resp.Body.Close()

	var raw struct {
		Status      string  `json:"status"`
		Country     string  `json:"country"`
		CountryCode string  `json:"countryCode"`
		RegionName  string  `json:"regionName"`
		City        string  `json:"city"`
		Lat         float64 `json:"lat"`
		Lon         float64 `json:"lon"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		log.Printf("geoip decode failed for %s: %v", ip, err)
		return &GeoIPResult{}
	}
	if raw.Status != "success" {
		return &GeoIPResult{}
	}

	result := &GeoIPResult{
		Country:     raw.Country,
		CountryCode: raw.CountryCode,
		RegionName:  raw.RegionName,
		City:        raw.City,
		Lat:         raw.Lat,
		Lon:         raw.Lon,
	}

	// Store in cache
	geoCacheMu.Lock()
	geoCache[ip] = &geoIPCacheEntry{result: result, expiresAt: time.Now().Add(geoCacheTTL)}
	// Evict expired entries occasionally (keep cache bounded)
	if len(geoCache) > 10000 {
		now := time.Now()
		for k, v := range geoCache {
			if now.After(v.expiresAt) {
				delete(geoCache, k)
			}
		}
	}
	geoCacheMu.Unlock()

	return result
}

// ---------------------------------------------------------------------------
// Bot detection
// ---------------------------------------------------------------------------

var botPatterns = []string{
	"googlebot", "bingbot", "yandexbot", "baiduspider", "duckduckbot",
	"slurp", "sogou", "exabot", "facebot", "facebookexternalhit",
	"ia_archiver", "alexabot", "mj12bot", "ahrefsbot", "semrushbot",
	"dotbot", "rogerbot", "seznambot", "twitterbot", "linkedinbot",
	"crawler", "spider", "bot/", "bot;", "crawl",
	"selenium", "puppeteer", "headlesschrome", "phantomjs",
	"curl/", "wget/", "python-requests", "python-urllib",
	"java/", "httpclient", "okhttp", "go-http-client",
	"apachebench", "loadrunner", "jmeter",
	"monitoring", "pingdom", "uptimerobot", "site24x7",
}

// DetectBot checks the User-Agent for known bot patterns.
// Returns (isBot, botName).
func DetectBot(ua string) (bool, string) {
	if ua == "" {
		return true, "empty-ua"
	}
	lower := strings.ToLower(ua)
	for _, pattern := range botPatterns {
		if strings.Contains(lower, pattern) {
			return true, pattern
		}
	}
	return false, ""
}

// ---------------------------------------------------------------------------
// Analytics settings helpers
// ---------------------------------------------------------------------------

// GetOrCreateAnalyticsSetting returns the single-row settings (ID=1), creating defaults if needed.
func GetOrCreateAnalyticsSetting(db *gorm.DB) (*models.AnalyticsSetting, error) {
	var s models.AnalyticsSetting
	err := db.First(&s, 1).Error
	if err == nil {
		return &s, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	s = models.AnalyticsSetting{
		ID:                 1,
		RetentionDays:      90,
		AutoCleanupEnabled: true,
		TrackingEnabled:    true,
	}
	if e := db.Create(&s).Error; e != nil {
		return nil, e
	}
	return &s, nil
}

// ---------------------------------------------------------------------------
// Scheduled cleanup
// ---------------------------------------------------------------------------

// StartAnalyticsCleanupScheduler runs a background goroutine that deletes old
// visitor_logs records based on the retention_days setting. Checks hourly, runs
// cleanup at most once per day.
func StartAnalyticsCleanupScheduler() {
	db := config.GetDB()
	if db == nil {
		return
	}

	go func() {
		t := time.NewTicker(1 * time.Hour)
		defer t.Stop()

		for range t.C {
			s, err := GetOrCreateAnalyticsSetting(db)
			if err != nil {
				log.Printf("analytics cleanup: settings load failed: %v", err)
				continue
			}
			if !s.AutoCleanupEnabled || s.RetentionDays <= 0 {
				continue
			}

			// Run at most once per day
			if s.LastCleanupAt != nil && time.Since(*s.LastCleanupAt) < 24*time.Hour {
				continue
			}

			cutoff := time.Now().AddDate(0, 0, -s.RetentionDays)
			result := db.Where("created_at < ?", cutoff).Delete(&models.VisitorLog{})
			if result.Error != nil {
				log.Printf("analytics cleanup: delete failed: %v", result.Error)
				continue
			}

			now := time.Now().UTC()
			_ = db.Model(&models.AnalyticsSetting{}).Where("id = ?", 1).Update("last_cleanup_at", &now).Error
			if result.RowsAffected > 0 {
				log.Printf("analytics cleanup: deleted %d records older than %s", result.RowsAffected, cutoff.Format("2006-01-02"))
			}
		}
	}()
}
