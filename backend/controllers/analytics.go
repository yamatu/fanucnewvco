package controllers

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"
	"net/http"
	"strconv"
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
