package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"
	"fanuc-backend/utils"
)

// DatasheetController exposes the Datasheets.com product search API to the
// admin catalogue as a supervised lookup tool.
//
// The contract:
//   - a lookup is read-only. It returns the provider records, which of them
//     match the part number exactly, and how much of the monthly quota is left,
//   - parameters only reach a product through a ProductDatasheetDraft that an
//     administrator approves, and approval refuses any value without a source,
//   - the datasheet URL / description suggestions are returned for the operator
//     to copy, never written behind their back.
type DatasheetController struct{}

const datasheetProviderLimits = "60/min · 500/hour · 5,000/month (provider default)"

// GetSettings returns the persisted configuration with the key replaced by a
// boolean.
func (dc *DatasheetController) GetSettings(c *gin.Context) {
	settings, row, err := services.LoadDatasheetSettings(config.GetDB())
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load the Datasheets.com settings", Error: err.Error()})
		return
	}
	data := gin.H{
		"provider":        "datasheets.com",
		"endpoint":        "GET /api/v1/search",
		"provider_limits": datasheetProviderLimits,
		"has_api_key":     strings.TrimSpace(settings.APIKey) != "",
		"api_key_from_env": row != nil && row.APIKeyFromEnv,
		"attribution":     services.DatasheetAttributionText(),
		"terms_url":       "https://www.datasheets.com/terms",
	}
	if row != nil && row.ID > 0 {
		data["setting"] = row.ToResponse()
	} else {
		data["setting"] = (&models.DatasheetSetting{
			PerMinuteLimit:   settings.PerMinuteLimit,
			PerHourLimit:     settings.PerHourLimit,
			MonthlyLimit:     settings.MonthlyLimit,
			AutoStopPercent:  settings.AutoStopPercent,
			CacheTTLDays:     settings.CacheTTLDays,
			DefaultPageLimit: settings.DefaultPageLimit,
		}).ToResponse()
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Datasheets.com settings", Data: data})
}

type datasheetSettingsRequest struct {
	Enabled *bool `json:"enabled"`

	// APIKey is write-only: sending it replaces the stored key, leaving it empty
	// keeps the current one.
	APIKey      string `json:"api_key"`
	ClearAPIKey bool   `json:"clear_api_key"`

	PerMinuteLimit   *int `json:"per_minute_limit"`
	PerHourLimit     *int `json:"per_hour_limit"`
	MonthlyLimit     *int `json:"monthly_limit"`
	AutoStopPercent  *int `json:"auto_stop_percent"`
	CacheTTLDays     *int `json:"cache_ttl_days"`
	DefaultPageLimit *int `json:"default_page_limit"`

	ResetUsage bool `json:"reset_usage"`
}

// UpdateSettings persists the configuration. The key is encrypted with the same
// SETTINGS_ENCRYPTION_KEY as every other stored secret on this server.
func (dc *DatasheetController) UpdateSettings(c *gin.Context) {
	var req datasheetSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid settings payload", Error: err.Error()})
		return
	}
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database connection failed"})
		return
	}

	var row models.DatasheetSetting
	err := db.Order("id ASC").First(&row).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load the Datasheets.com settings", Error: err.Error()})
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row = models.DatasheetSetting{
			PerMinuteLimit:   60,
			PerHourLimit:     500,
			MonthlyLimit:     5000,
			AutoStopPercent:  90,
			CacheTTLDays:     90,
			DefaultPageLimit: 10,
		}
	}

	if req.Enabled != nil {
		row.Enabled = *req.Enabled
	}
	if key := strings.TrimSpace(req.APIKey); key != "" {
		encrypted, encErr := utils.EncryptSecret(key)
		if encErr != nil {
			c.JSON(http.StatusBadRequest, models.APIResponse{
				Success: false,
				Message: "The API key could not be encrypted. Check SETTINGS_ENCRYPTION_KEY on the backend.",
				Error:   encErr.Error(),
			})
			return
		}
		row.APIKeyEnc = encrypted
		row.APIKeyFromEnv = false
	}
	if req.ClearAPIKey {
		row.APIKeyEnc = ""
		row.APIKeyFromEnv = false
	}
	if req.PerMinuteLimit != nil {
		if *req.PerMinuteLimit < 1 || *req.PerMinuteLimit > 6000 {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "per_minute_limit must be between 1 and 6000"})
			return
		}
		row.PerMinuteLimit = *req.PerMinuteLimit
	}
	if req.PerHourLimit != nil {
		if *req.PerHourLimit < 1 || *req.PerHourLimit > 100000 {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "per_hour_limit must be between 1 and 100000"})
			return
		}
		row.PerHourLimit = *req.PerHourLimit
	}
	if req.MonthlyLimit != nil {
		if *req.MonthlyLimit < 1 || *req.MonthlyLimit > 1000000 {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "monthly_limit must be between 1 and 1000000"})
			return
		}
		row.MonthlyLimit = *req.MonthlyLimit
	}
	if req.AutoStopPercent != nil {
		if *req.AutoStopPercent < 1 || *req.AutoStopPercent > 100 {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "auto_stop_percent must be between 1 and 100"})
			return
		}
		row.AutoStopPercent = *req.AutoStopPercent
	}
	if req.CacheTTLDays != nil {
		if *req.CacheTTLDays < 0 || *req.CacheTTLDays > 3650 {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "cache_ttl_days must be between 0 and 3650"})
			return
		}
		row.CacheTTLDays = *req.CacheTTLDays
	}
	if req.DefaultPageLimit != nil {
		if *req.DefaultPageLimit < 1 || *req.DefaultPageLimit > 10 {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "default_page_limit must be between 1 and 10 (provider maximum)"})
			return
		}
		row.DefaultPageLimit = *req.DefaultPageLimit
	}
	if req.ResetUsage {
		row.MonthlyUsed = 0
		row.QuotaMonth = ""
	}

	if err := db.Save(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to save the Datasheets.com settings", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Datasheets.com settings saved", Data: row.ToResponse()})
}

// TestKey performs one real lookup to prove the key works. It costs one call and
// bypasses the cache on purpose.
func (dc *DatasheetController) TestKey(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		query = "BAV99"
	}
	ctx := services.WithManualDatasheetLookup(c.Request.Context())
	lookup, err := services.LookupDatasheetPart(ctx, config.GetDB(), query, 1, 1, true)
	if err != nil {
		c.JSON(http.StatusBadGateway, models.APIResponse{Success: false, Message: "Datasheets.com rejected the request", Error: err.Error()})
		return
	}
	sample := ""
	if len(lookup.Records) > 0 {
		sample = lookup.Records[0].MPN
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Datasheets.com API key works", Data: gin.H{
		"query":           lookup.Query,
		"count":           lookup.Count,
		"sample_mpn":      sample,
		"quota_remaining": lookup.QuotaRemaining,
		"quota_limit":     lookup.QuotaLimit,
	}})
}

// Search is the endpoint the admin lookup panel calls.
func (dc *DatasheetController) Search(c *gin.Context) {
	var payload struct {
		Q         string `json:"q"`
		Query     string `json:"query"`
		MPN       string `json:"mpn"`
		Page      int    `json:"page"`
		Limit     int    `json:"limit"`
		Refresh   bool   `json:"refresh"`
		ProductID uint   `json:"product_id"`
	}
	_ = c.ShouldBindJSON(&payload)

	query := firstNonEmptyDatasheetString(payload.Q, payload.Query, payload.MPN)
	if query == "" {
		query = strings.TrimSpace(c.Query("q"))
	}
	page, limit := payload.Page, payload.Limit
	if page == 0 && limit == 0 {
		parsedPage, parsedLimit := services.ParseDatasheetPageQuery(c.Query("page"), c.Query("limit"))
		page, limit = parsedPage, parsedLimit
	}
	refresh := payload.Refresh || c.Query("refresh") == "1" || c.Query("refresh") == "true"
	if query == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "A part number (q) is required"})
		return
	}

	var product *models.Product
	if payload.ProductID > 0 {
		var found models.Product
		if err := config.GetDB().First(&found, payload.ProductID).Error; err == nil {
			product = &found
		}
	}

	ctx := services.WithManualDatasheetLookup(c.Request.Context())
	lookup, err := services.LookupDatasheetPart(ctx, config.GetDB(), query, page, limit, refresh)
	if err != nil {
		status := http.StatusBadGateway
		var waiting *services.ErrDatasheetQuotaWaiting
		if errors.As(err, &waiting) {
			status = http.StatusTooManyRequests
		} else if errors.Is(err, services.ErrDatasheetNotConfigured) {
			status = http.StatusPreconditionFailed
		}
		c.JSON(status, models.APIResponse{Success: false, Message: "Datasheets.com lookup failed", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Datasheets.com lookup", Data: gin.H{
		"lookup":      lookup,
		"product":     datasheetProductContext(product),
		"suggestions": datasheetSuggestions(lookup),
		"attribution": services.DatasheetAttributionText(),
	}})
}

// ToDraft stores the exact-match record as a pending draft.
func (dc *DatasheetController) ToDraft(c *gin.Context) {
	var payload struct {
		ProductID uint                        `json:"product_id"`
		MPN       string                      `json:"mpn"`
		Query     string                      `json:"q"`
		Specs     []services.DatasheetSpec    `json:"specs"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request data", Error: err.Error()})
		return
	}
	query := firstNonEmptyDatasheetString(payload.Query, payload.MPN)
	if query == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "A part number is required"})
		return
	}

	db := config.GetDB()
	var product *models.Product
	if payload.ProductID > 0 {
		var found models.Product
		if err := db.First(&found, payload.ProductID).Error; err != nil {
			c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Product not found"})
			return
		}
		product = &found
	}

	// A cached lookup is served from the database, so building the draft a
	// second time costs no provider quota.
	ctx := services.WithManualDatasheetLookup(c.Request.Context())
	lookup, err := services.LookupDatasheetPart(ctx, db, query, 1, 10, false)
	if err != nil {
		c.JSON(http.StatusBadGateway, models.APIResponse{Success: false, Message: "Datasheets.com lookup failed", Error: err.Error()})
		return
	}
	record, ok := services.DatasheetExactRecord(lookup, payload.MPN)
	if !ok {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Datasheets.com has no record whose part number matches exactly, so its values cannot be proposed from here",
		})
		return
	}
	candidates := services.DatasheetLookupToCandidates(record)
	if len(payload.Specs) > 0 {
		candidates = services.DatasheetFilterCandidates(candidates, payload.Specs)
	}
	if len(candidates) == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "This Datasheets.com record has no parameters to propose"})
		return
	}

	draft, err := services.StoreDatasheetDraft(db, services.DatasheetDraftInput{
		Product:    product,
		Query:      query,
		Record:     record,
		Candidates: candidates,
		UserID:     currentDatasheetUserID(c),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to create the draft", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Draft created for review", Data: draft})
}

// ListDrafts returns the review queue.
func (dc *DatasheetController) ListDrafts(c *gin.Context) {
	db := config.GetDB()
	query := db.Model(&models.ProductDatasheetDraft{})
	if status := strings.TrimSpace(c.Query("status")); status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("sku LIKE ? OR model LIKE ? OR brand LIKE ? OR source_mpn LIKE ?", like, like, like, like)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to count drafts", Error: err.Error()})
		return
	}
	page, pageSize := 1, 20
	if parsed, err := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("page", "1"))); err == nil && parsed > 0 {
		page = parsed
	}
	if parsed, err := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("page_size", "20"))); err == nil && parsed > 0 && parsed <= 100 {
		pageSize = parsed
	}
	var drafts []models.ProductDatasheetDraft
	if err := query.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&drafts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load drafts", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: gin.H{
		"data":        drafts,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
	}})
}

// GetDraft returns one draft with its per-value provenance.
func (dc *DatasheetController) GetDraft(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid draft id"})
		return
	}
	var draft models.ProductDatasheetDraft
	if err := config.GetDB().First(&draft, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Draft not found"})
		return
	}
	candidates := services.DecodeDatasheetCandidates(draft.CandidatesJSON)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: gin.H{
		"draft":      draft,
		"candidates": candidates,
		"notes":      draft.Notes,
	}})
}

type datasheetApproveRequest struct {
	Candidates []services.DatasheetCandidate `json:"candidates"`
	Overwrite  bool                          `json:"overwrite"`
}

// ApproveDraft applies the reviewed parameters to the product.
func (dc *DatasheetController) ApproveDraft(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid draft id"})
		return
	}
	var req datasheetApproveRequest
	_ = c.ShouldBindJSON(&req)

	db := config.GetDB()
	var draft models.ProductDatasheetDraft
	if err := db.First(&draft, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Draft not found"})
		return
	}
	if draft.Status == "approved" {
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Draft already applied", Data: draft})
		return
	}
	if draft.ProductID == 0 {
		// A draft started from a bare part number can still be applied when its
		// SKU identifies exactly one product.
		if sku := strings.TrimSpace(draft.SKU); sku != "" {
			var matched models.Product
			if err := db.Where("sku = ?", sku).First(&matched).Error; err == nil {
				draft.ProductID = matched.ID
			} else {
				c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "This draft is not linked to a product. Open the product and start the lookup from there."})
				return
			}
		} else {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "This draft is not linked to a product. Open the product and start the lookup from there."})
			return
		}
	}

	added, skipped, encoded, err := services.ApplyDatasheetDraft(db, &draft, req.Candidates, req.Overwrite, currentDatasheetUserID(c))
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "no cited source") || strings.Contains(err.Error(), "no parameters") || strings.Contains(err.Error(), "no longer exists") {
			status = http.StatusBadRequest
		}
		c.JSON(status, models.APIResponse{Success: false, Message: "Failed to apply the draft", Error: err.Error()})
		return
	}

	now := time.Now()
	draft.Status = "approved"
	draft.ReviewedBy = currentDatasheetUserID(c)
	draft.ReviewedAt = &now
	if added > 0 {
		draft.AppliedAt = &now
	}
	if err := db.Save(&draft).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Parameters saved but the draft could not be updated", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Draft applied", Data: gin.H{
		"draft":           draft,
		"added":           added,
		"skipped":         skipped,
		"technical_specs": encoded,
	}})
}

// RejectDraft closes a draft without touching the product.
func (dc *DatasheetController) RejectDraft(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid draft id"})
		return
	}
	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)

	db := config.GetDB()
	var draft models.ProductDatasheetDraft
	if err := db.First(&draft, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Draft not found"})
		return
	}
	now := time.Now()
	draft.Status = "rejected"
	draft.ReviewedBy = currentDatasheetUserID(c)
	draft.ReviewedAt = &now
	draft.RejectReason = strings.TrimSpace(req.Reason)
	if err := db.Save(&draft).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to reject the draft", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Draft rejected", Data: draft})
}

// ListCache shows what has already been looked up, without spending quota.
func (dc *DatasheetController) ListCache(c *gin.Context) {
	db := config.GetDB()
	query := db.Model(&models.DatasheetLookupCache{})
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("mpn LIKE ? OR query_key LIKE ?", like, like)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to count cached lookups", Error: err.Error()})
		return
	}
	page, pageSize := 1, 30
	if parsed, err := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("page", "1"))); err == nil && parsed > 0 {
		page = parsed
	}
	if parsed, err := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("page_size", "30"))); err == nil && parsed > 0 && parsed <= 200 {
		pageSize = parsed
	}
	var rows []models.DatasheetLookupCache
	if err := query.Order("fetched_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load cached lookups", Error: err.Error()})
		return
	}
	items := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		items = append(items, gin.H{
			"id":           row.ID,
			"mpn":          row.MPN,
			"query_key":    row.QueryKey,
			"result_count": row.ResultCount,
			"match_count":  row.MatchCount,
			"fetched_at":   row.FetchedAt,
			"expires_at":   row.ExpiresAt,
			"hit_count":    row.HitCount,
			"last_hit_at":  row.LastHitAt,
		})
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Cached Datasheets.com lookups", Data: gin.H{
		"items":       items,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
	}})
}

// currentDatasheetUserID reads the authenticated admin id for the audit trail.
func currentDatasheetUserID(c *gin.Context) uint {
	if id := currentAdminUserID(c); id != nil {
		return *id
	}
	return 0
}

func firstNonEmptyDatasheetString(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func datasheetProductContext(product *models.Product) gin.H {
	if product == nil {
		return nil
	}
	specs := strings.TrimSpace(product.TechnicalSpecs)
	return gin.H{
		"id":            product.ID,
		"sku":           product.SKU,
		"name":          product.Name,
		"brand":         product.Brand,
		"model":         product.Model,
		"part_number":   product.PartNumber,
		"datasheet_url": product.DatasheetURL,
		"has_specs":     specs != "" && specs != "{}" && specs != "null",
	}
}

func datasheetSuggestions(lookup *services.DatasheetLookup) gin.H {
	record, ok := services.DatasheetBestExactRecord(lookup)
	if !ok {
		return gin.H{"has_exact_match": false}
	}
	return gin.H{
		"has_exact_match": true,
		"mpn":             record.MPN,
		"manufacturer":    record.Manufacturer,
		"fields":          services.DatasheetSuggestedProductFields(record),
		"spec_count":      len(record.Specs),
		"datasheet_url":   record.DatasheetURL,
		"record_url":      record.URL,
	}
}
