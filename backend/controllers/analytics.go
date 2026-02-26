package controllers

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// AnalyticsController provides admin endpoints for visitor analytics.
type AnalyticsController struct{}

// ---------------------------------------------------------------------------
// GET /admin/analytics/overview?start=&end=
// ---------------------------------------------------------------------------

type analyticsOverviewResponse struct {
	TotalVisitors int64   `json:"total_visitors"`
	UniqueIPs     int64   `json:"unique_ips"`
	TotalBots     int64   `json:"total_bots"`
	BotPercentage float64 `json:"bot_percentage"`
	TopCountry    string  `json:"top_country"`
	TopCountryCount int64 `json:"top_country_count"`
}

func (ac *AnalyticsController) GetOverview(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	start, end := parseDateRange(c)
	q := db.Model(&models.VisitorLog{})
	if start != nil {
		q = q.Where("created_at >= ?", *start)
	}
	if end != nil {
		q = q.Where("created_at <= ?", *end)
	}
	if source := c.Query("source"); source != "" {
		q = q.Where("source = ?", source)
	}

	var total int64
	q.Count(&total)

	var uniqueIPs int64
	q.Distinct("ip_address").Count(&uniqueIPs)

	var totalBots int64
	q.Where("is_bot = ?", true).Count(&totalBots)

	var botPct float64
	if total > 0 {
		botPct = float64(totalBots) / float64(total) * 100
	}

	// Top country (excluding bots)
	type countryRow struct {
		CountryCode string `json:"country_code"`
		Cnt         int64  `json:"cnt"`
	}
	var topCountry countryRow
	subQ := db.Model(&models.VisitorLog{}).Where("is_bot = ?", false)
	if start != nil {
		subQ = subQ.Where("created_at >= ?", *start)
	}
	if end != nil {
		subQ = subQ.Where("created_at <= ?", *end)
	}
	if source := c.Query("source"); source != "" {
		subQ = subQ.Where("source = ?", source)
	}
	subQ.Select("country_code, COUNT(*) as cnt").
		Where("country_code != ''").
		Group("country_code").
		Order("cnt DESC").
		Limit(1).
		Scan(&topCountry)

	resp := analyticsOverviewResponse{
		TotalVisitors:   total,
		UniqueIPs:       uniqueIPs,
		TotalBots:       totalBots,
		BotPercentage:   botPct,
		TopCountry:      topCountry.CountryCode,
		TopCountryCount: topCountry.Cnt,
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: resp})
}

// ---------------------------------------------------------------------------
// GET /admin/analytics/visitors?page=&page_size=&start=&end=&country=&is_bot=&ip=
// ---------------------------------------------------------------------------

func (ac *AnalyticsController) GetVisitors(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	start, end := parseDateRange(c)
	q := db.Model(&models.VisitorLog{})
	if start != nil {
		q = q.Where("created_at >= ?", *start)
	}
	if end != nil {
		q = q.Where("created_at <= ?", *end)
	}
	if country := c.Query("country"); country != "" {
		q = q.Where("country_code = ?", country)
	}
	if isBot := c.Query("is_bot"); isBot != "" {
		q = q.Where("is_bot = ?", isBot == "true" || isBot == "1")
	}
	if ip := c.Query("ip"); ip != "" {
		q = q.Where("ip_address LIKE ?", "%"+ip+"%")
	}
	if source := c.Query("source"); source != "" {
		q = q.Where("source = ?", source)
	}

	var total int64
	q.Count(&total)

	var logs []models.VisitorLog
	q.Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&logs)

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "OK",
		Data: gin.H{
			"data":        logs,
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// ---------------------------------------------------------------------------
// GET /admin/analytics/countries?start=&end=&is_bot=false
// ---------------------------------------------------------------------------

type countryData struct {
	Country     string `json:"country"`
	CountryCode string `json:"country_code"`
	Count       int64  `json:"count"`
}

func (ac *AnalyticsController) GetCountries(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	start, end := parseDateRange(c)
	q := db.Model(&models.VisitorLog{}).Where("country_code != ''")
	if start != nil {
		q = q.Where("created_at >= ?", *start)
	}
	if end != nil {
		q = q.Where("created_at <= ?", *end)
	}
	// Default: exclude bots
	isBot := c.DefaultQuery("is_bot", "false")
	if isBot == "false" || isBot == "0" {
		q = q.Where("is_bot = ?", false)
	}
	if source := c.Query("source"); source != "" {
		q = q.Where("source = ?", source)
	}

	var countries []countryData
	q.Select("country, country_code, COUNT(*) as count").
		Group("country, country_code").
		Order("count DESC").
		Find(&countries)

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: countries})
}

// ---------------------------------------------------------------------------
// GET /admin/analytics/pages?start=&end=&limit=20
// ---------------------------------------------------------------------------

type pageData struct {
	Path  string `json:"path"`
	Count int64  `json:"count"`
}

func (ac *AnalyticsController) GetPages(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	start, end := parseDateRange(c)
	q := db.Model(&models.VisitorLog{}).Where("is_bot = ?", false)
	if start != nil {
		q = q.Where("created_at >= ?", *start)
	}
	if end != nil {
		q = q.Where("created_at <= ?", *end)
	}
	if source := c.Query("source"); source != "" {
		q = q.Where("source = ?", source)
	}

	var pages []pageData
	q.Select("path, COUNT(*) as count").
		Group("path").
		Order("count DESC").
		Limit(limit).
		Find(&pages)

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: pages})
}

// ---------------------------------------------------------------------------
// GET /admin/analytics/trends?start=&end=
// ---------------------------------------------------------------------------

type trendData struct {
	Date      string `json:"date"`
	Total     int64  `json:"total"`
	UniqueIPs int64  `json:"unique_ips"`
	Bots      int64  `json:"bots"`
}

func (ac *AnalyticsController) GetTrends(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	start, end := parseDateRange(c)
	q := db.Model(&models.VisitorLog{})
	if start != nil {
		q = q.Where("created_at >= ?", *start)
	}
	if end != nil {
		q = q.Where("created_at <= ?", *end)
	}
	if source := c.Query("source"); source != "" {
		q = q.Where("source = ?", source)
	}

	var trends []trendData
	q.Select("DATE(created_at) as date, COUNT(*) as total, COUNT(DISTINCT ip_address) as unique_ips, SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) as bots").
		Group("DATE(created_at)").
		Order("date ASC").
		Find(&trends)

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: trends})
}

// ---------------------------------------------------------------------------
// GET /admin/analytics/settings
// ---------------------------------------------------------------------------

func (ac *AnalyticsController) GetSettings(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	s, err := services.GetOrCreateAnalyticsSetting(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load settings", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: s})
}

// ---------------------------------------------------------------------------
// PUT /admin/analytics/settings
// ---------------------------------------------------------------------------

type updateAnalyticsSettingsRequest struct {
	RetentionDays      *int  `json:"retention_days"`
	AutoCleanupEnabled *bool `json:"auto_cleanup_enabled"`
	TrackingEnabled    *bool `json:"tracking_enabled"`
}

func (ac *AnalyticsController) UpdateSettings(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	var req updateAnalyticsSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}

	s, err := services.GetOrCreateAnalyticsSetting(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load settings", Error: err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.RetentionDays != nil {
		updates["retention_days"] = *req.RetentionDays
	}
	if req.AutoCleanupEnabled != nil {
		updates["auto_cleanup_enabled"] = *req.AutoCleanupEnabled
	}
	if req.TrackingEnabled != nil {
		updates["tracking_enabled"] = *req.TrackingEnabled
	}

	if len(updates) > 0 {
		if err := db.Model(s).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to update settings", Error: err.Error()})
			return
		}
	}

	// Reload
	s, _ = services.GetOrCreateAnalyticsSetting(db)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Settings updated", Data: s})
}

// ---------------------------------------------------------------------------
// DELETE /admin/analytics/cleanup?before=2024-06-01
// ---------------------------------------------------------------------------

func (ac *AnalyticsController) ManualCleanup(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	beforeStr := c.Query("before")
	if beforeStr == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing 'before' date parameter (YYYY-MM-DD)"})
		return
	}
	before, err := time.Parse("2006-01-02", beforeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid date format, use YYYY-MM-DD", Error: err.Error()})
		return
	}

	result := db.Where("created_at < ?", before).Delete(&models.VisitorLog{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to delete records", Error: result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Cleanup completed",
		Data: gin.H{
			"deleted_count": result.RowsAffected,
			"before":        beforeStr,
		},
	})
}

// ---------------------------------------------------------------------------
// GET /admin/analytics/country-visitors?country=US&start=&end=&page=&page_size=
// Returns visitor IPs for a specific country (click-through from map)
// ---------------------------------------------------------------------------

type countryVisitorRow struct {
	IPAddress  string `json:"ip_address"`
	City       string `json:"city"`
	Region     string `json:"region"`
	VisitCount int64  `json:"visit_count"`
	LastVisit  string `json:"last_visit"`
}

func (ac *AnalyticsController) GetCountryVisitors(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	country := c.Query("country")
	if country == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing 'country' parameter"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	start, end := parseDateRange(c)
	q := db.Model(&models.VisitorLog{}).Where("country_code = ? AND is_bot = ?", country, false)
	if start != nil {
		q = q.Where("created_at >= ?", *start)
	}
	if end != nil {
		q = q.Where("created_at <= ?", *end)
	}

	// Count distinct IPs for pagination
	var totalDistinct int64
	db.Raw("SELECT COUNT(DISTINCT ip_address) FROM visitor_logs WHERE country_code = ? AND is_bot = ?"+
		dateWhereSuffix(start, end), country, false).Scan(&totalDistinct)

	var rows []countryVisitorRow
	q.Select("ip_address, city, region, COUNT(*) as visit_count, MAX(created_at) as last_visit").
		Group("ip_address, city, region").
		Order("visit_count DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&rows)

	totalPages := int(totalDistinct) / pageSize
	if int(totalDistinct)%pageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "OK",
		Data: gin.H{
			"country":     country,
			"data":        rows,
			"page":        page,
			"page_size":   pageSize,
			"total":       totalDistinct,
			"total_pages": totalPages,
		},
	})
}

// ---------------------------------------------------------------------------
// GET /admin/analytics/product-skus?start=&end=&country=&limit=20
// Returns hot product SKUs extracted from /products/<sku> paths, grouped by
// visit count. Optionally filter by country to see which SKUs each country likes.
// ---------------------------------------------------------------------------

type productSKUData struct {
	SKU         string `json:"sku"`
	Path        string `json:"path"`
	Count       int64  `json:"count"`
	UniqueIPs   int64  `json:"unique_ips"`
	TopCountry  string `json:"top_country"`
}

func (ac *AnalyticsController) GetProductSKUs(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	start, end := parseDateRange(c)
	q := db.Model(&models.VisitorLog{}).
		Where("is_bot = ? AND path LIKE ?", false, "/products/%")
	if start != nil {
		q = q.Where("created_at >= ?", *start)
	}
	if end != nil {
		q = q.Where("created_at <= ?", *end)
	}
	if country := c.Query("country"); country != "" {
		q = q.Where("country_code = ?", country)
	}

	type rawRow struct {
		Path      string `json:"path"`
		Count     int64  `json:"count"`
		UniqueIPs int64  `json:"unique_ips"`
	}
	var raw []rawRow
	q.Select("path, COUNT(*) as count, COUNT(DISTINCT ip_address) as unique_ips").
		Group("path").
		Order("count DESC").
		Limit(limit).
		Find(&raw)

	// Extract SKU from path and find top country per path
	result := make([]productSKUData, 0, len(raw))
	for _, r := range raw {
		sku := extractSKUFromPath(r.Path)
		if sku == "" {
			continue
		}

		// Find top country for this product path
		var topC struct {
			CountryCode string `json:"country_code"`
		}
		subQ := db.Model(&models.VisitorLog{}).
			Where("path = ? AND is_bot = ? AND country_code != ''", r.Path, false)
		if start != nil {
			subQ = subQ.Where("created_at >= ?", *start)
		}
		if end != nil {
			subQ = subQ.Where("created_at <= ?", *end)
		}
		subQ.Select("country_code").
			Group("country_code").
			Order("COUNT(*) DESC").
			Limit(1).
			Scan(&topC)

		result = append(result, productSKUData{
			SKU:        sku,
			Path:       r.Path,
			Count:      r.Count,
			UniqueIPs:  r.UniqueIPs,
			TopCountry: topC.CountryCode,
		})
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: result})
}

// ---------------------------------------------------------------------------
// GET /admin/analytics/country-skus?start=&end=&limit=10
// Returns top countries with their favorite SKUs
// ---------------------------------------------------------------------------

type countrySKUData struct {
	CountryCode string   `json:"country_code"`
	Country     string   `json:"country"`
	TotalViews  int64    `json:"total_views"`
	TopSKUs     []skuHit `json:"top_skus"`
}

type skuHit struct {
	SKU   string `json:"sku"`
	Path  string `json:"path"`
	Count int64  `json:"count"`
}

func (ac *AnalyticsController) GetCountrySKUs(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit < 1 || limit > 50 {
		limit = 10
	}

	start, end := parseDateRange(c)

	// Get top countries by product page views
	type topCountryRow struct {
		CountryCode string `json:"country_code"`
		Country     string `json:"country"`
		TotalViews  int64  `json:"total_views"`
	}
	var topCountries []topCountryRow
	q := db.Model(&models.VisitorLog{}).
		Where("is_bot = ? AND path LIKE ? AND country_code != ''", false, "/products/%")
	if start != nil {
		q = q.Where("created_at >= ?", *start)
	}
	if end != nil {
		q = q.Where("created_at <= ?", *end)
	}
	q.Select("country_code, country, COUNT(*) as total_views").
		Group("country_code, country").
		Order("total_views DESC").
		Limit(limit).
		Find(&topCountries)

	// For each country get top 5 SKUs
	result := make([]countrySKUData, 0, len(topCountries))
	for _, tc := range topCountries {
		type pathRow struct {
			Path  string `json:"path"`
			Count int64  `json:"count"`
		}
		var paths []pathRow
		sq := db.Model(&models.VisitorLog{}).
			Where("is_bot = ? AND path LIKE ? AND country_code = ?", false, "/products/%", tc.CountryCode)
		if start != nil {
			sq = sq.Where("created_at >= ?", *start)
		}
		if end != nil {
			sq = sq.Where("created_at <= ?", *end)
		}
		sq.Select("path, COUNT(*) as count").
			Group("path").
			Order("count DESC").
			Limit(5).
			Find(&paths)

		skus := make([]skuHit, 0, len(paths))
		for _, p := range paths {
			sku := extractSKUFromPath(p.Path)
			if sku != "" {
				skus = append(skus, skuHit{SKU: sku, Path: p.Path, Count: p.Count})
			}
		}
		result = append(result, countrySKUData{
			CountryCode: tc.CountryCode,
			Country:     tc.Country,
			TotalViews:  tc.TotalViews,
			TopSKUs:     skus,
		})
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: result})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func parseDateRange(c *gin.Context) (*time.Time, *time.Time) {
	var start, end *time.Time
	if s := c.Query("start"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			start = &t
		}
	}
	if e := c.Query("end"); e != "" {
		if t, err := time.Parse("2006-01-02", e); err == nil {
			// End of day
			eod := t.Add(24*time.Hour - time.Second)
			end = &eod
		}
	}
	return start, end
}

// extractSKUFromPath converts "/products/a16b-3200-0100" to "A16B-3200-0100".
func extractSKUFromPath(p string) string {
	p = strings.TrimPrefix(p, "/products/")
	p = strings.TrimSuffix(p, "/")
	if p == "" || p == "products" {
		return ""
	}
	// If it still contains a slash it's not a simple product slug
	if strings.Contains(p, "/") {
		return ""
	}
	return strings.ToUpper(p)
}

// dateWhereSuffix builds a raw SQL suffix for date filters (used by raw queries).
func dateWhereSuffix(start, end *time.Time) string {
	s := ""
	if start != nil {
		s += " AND created_at >= '" + start.Format("2006-01-02 15:04:05") + "'"
	}
	if end != nil {
		s += " AND created_at <= '" + end.Format("2006-01-02 15:04:05") + "'"
	}
	return s
}
