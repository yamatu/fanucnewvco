package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/utils"
)

// Datasheets.com product search API (GET /api/v1/search).
//
// Scope note, measured against this catalogue: the provider is an electronic
// component library. Roughly one in five of our part numbers matches, and the
// ones that do are the electronic parts (Omron sensors, Phoenix Contact
// terminals, relays); FANUC/Yaskawa/Siemens assembly numbers are absent, and
// many matching industrial records carry no parameter table at all. The account
// quota is 5,000 calls a month against hundreds of thousands of SKUs.
//
// So this is a supervised lookup tool, not an enrichment pipeline:
//   - nothing here writes to a product; a draft is created for review,
//   - a record whose part number is not identical to the requested one is never
//     treated as a match, because the API also returns fuzzy neighbours
//     (3RV1742-5FD10 for 3RV1742-5LD10) and publishing a neighbour's values
//     would be a silent data error,
//   - repeated lookups are served from a local cache and cost no quota.
const (
	datasheetAPIBaseURL   = "https://www.datasheets.com/api/v1/search"
	datasheetAPIUserAgent = "vcocncspare-admin/1.0"
	datasheetCallTimeout  = 15 * time.Second
	// datasheetSpecsPerRecordCap stops one semiconductor record from flooding
	// the review queue with several dozen rows.
	datasheetSpecsPerRecordCap = 40

	datasheetAttribution = "Data from Datasheets.com"
)

// ErrDatasheetNotConfigured means no API key is available at all.
var ErrDatasheetNotConfigured = errors.New("Datasheets.com API key is not configured")

// ErrDatasheetQuotaWaiting means the local guard refused the call.
type ErrDatasheetQuotaWaiting struct {
	Reason     string
	RetryAfter time.Duration
}

func (e *ErrDatasheetQuotaWaiting) Error() string { return e.Reason }

// DatasheetSpec is one name/value pair as published by the provider.
type DatasheetSpec struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// DatasheetRecord is one provider result, trimmed to what the review UI shows.
type DatasheetRecord struct {
	MPN          string          `json:"mpn"`
	Manufacturer string          `json:"manufacturer"`
	Title        string          `json:"title"`
	Description  string          `json:"description"`
	URL          string          `json:"url"`
	Category1    string          `json:"category1,omitempty"`
	Category2    string          `json:"category2,omitempty"`
	Category3    string          `json:"category3,omitempty"`
	Category4    string          `json:"category4,omitempty"`
	PackageType  string          `json:"package_type,omitempty"`
	Lifecycle    string          `json:"lifecycle_status,omitempty"`
	DatasheetURL string          `json:"datasheet_url,omitempty"`
	ImageURL     string          `json:"primary_image_url,omitempty"`
	Specs        []DatasheetSpec `json:"specs,omitempty"`
	// ExactMatch is true only when MPN equals the requested part number after
	// normalisation. Only exact matches may become product parameters.
	ExactMatch bool `json:"exact_match"`
}

// DatasheetLookup is the answer for one part number, cache or network.
type DatasheetLookup struct {
	Query    string            `json:"query"`
	QueryKey string            `json:"query_key"`
	Page     int               `json:"page"`
	Limit    int               `json:"limit"`
	Count    int               `json:"count"`
	Records  []DatasheetRecord `json:"records"`

	CacheHit bool       `json:"cache_hit"`
	CacheAge string     `json:"cache_age,omitempty"`
	CachedAt *time.Time `json:"cached_at,omitempty"`

	ExactCount     int       `json:"exact_count"`
	QuotaRemaining int       `json:"quota_remaining"`
	QuotaLimit     int       `json:"quota_limit"`
	QuotaMonth     string    `json:"quota_month,omitempty"`
	Notice         string    `json:"notice,omitempty"`
	Attribution    string    `json:"attribution"`
	FetchedAt      time.Time `json:"fetched_at"`
}

// DatasheetCandidate is one parameter proposed for review. It mirrors the shape
// the admin UI renders: a label, the value, and where it came from.
type DatasheetCandidate struct {
	Label       string `json:"label"`
	Value       string `json:"value"`
	SourceURL   string `json:"source_url,omitempty"`
	SourceTitle string `json:"source_title,omitempty"`
	SourceType  string `json:"source_type,omitempty"`
	Evidence    string `json:"evidence,omitempty"`
	Origin      string `json:"origin,omitempty"`
}

// DatasheetServiceSettings is a resolved, decrypted view of DatasheetSetting.
type DatasheetServiceSettings struct {
	Enabled          bool
	APIKey           string
	PerMinuteLimit   int
	PerHourLimit     int
	MonthlyLimit     int
	AutoStopPercent  int
	CacheTTLDays     int
	DefaultPageLimit int
}

type datasheetRawResponse struct {
	Query   string `json:"query"`
	Page    int    `json:"page"`
	Limit   int    `json:"limit"`
	Count   int    `json:"count"`
	Results []struct {
		MPN             string `json:"mpn"`
		Manufacturer    string `json:"manufacturer"`
		Title           string `json:"title"`
		Description     string `json:"description"`
		URL             string `json:"url"`
		Category1       string `json:"category1"`
		Category2       string `json:"category2"`
		Category3       string `json:"category3"`
		Category4       string `json:"category4"`
		PackageType     string `json:"packageType"`
		LifecycleStatus string `json:"lifecycleStatus"`
		DatasheetURL    string `json:"datasheetUrl"`
		PrimaryImageURL string `json:"primaryImageUrl"`
		Specs           []struct {
			Name  string `json:"name"`
			Value string `json:"value"`
		} `json:"specs"`
	} `json:"results"`
}

// LoadDatasheetSettings reads the settings row, falling back to
// DATASHEETS_API_KEY when no key was saved through the UI.
func LoadDatasheetSettings(db *gorm.DB) (DatasheetServiceSettings, *models.DatasheetSetting, error) {
	resolved := DatasheetServiceSettings{
		PerMinuteLimit:   60,
		PerHourLimit:     500,
		MonthlyLimit:     5000,
		AutoStopPercent:  90,
		CacheTTLDays:     90,
		DefaultPageLimit: 10,
	}
	if db == nil {
		return resolved, nil, errors.New("database connection failed")
	}
	var setting models.DatasheetSetting
	err := db.Order("id ASC").First(&setting).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return resolved, nil, err
	}
	hasRow := err == nil

	key := ""
	if hasRow && strings.TrimSpace(setting.APIKeyEnc) != "" {
		if plain, decErr := utils.DecryptSecret(setting.APIKeyEnc); decErr == nil {
			key = strings.TrimSpace(plain)
		} else {
			// A rotated SETTINGS_ENCRYPTION_KEY makes old secrets unreadable.
			log.Printf("datasheet api: stored key cannot be decrypted: %v", decErr)
		}
	}
	fromEnv := false
	if key == "" {
		if envKey := strings.TrimSpace(os.Getenv("DATASHEETS_API_KEY")); envKey != "" {
			key = envKey
			fromEnv = true
		}
	}

	resolved.APIKey = key
	if hasRow {
		resolved.Enabled = setting.Enabled
		if setting.PerMinuteLimit > 0 {
			resolved.PerMinuteLimit = setting.PerMinuteLimit
		}
		if setting.PerHourLimit > 0 {
			resolved.PerHourLimit = setting.PerHourLimit
		}
		if setting.MonthlyLimit > 0 {
			resolved.MonthlyLimit = setting.MonthlyLimit
		}
		if setting.AutoStopPercent > 0 && setting.AutoStopPercent <= 100 {
			resolved.AutoStopPercent = setting.AutoStopPercent
		}
		if setting.CacheTTLDays >= 0 {
			resolved.CacheTTLDays = setting.CacheTTLDays
		}
		if setting.DefaultPageLimit > 0 {
			resolved.DefaultPageLimit = setting.DefaultPageLimit
		}
	}
	if fromEnv && hasRow {
		setting.APIKeyFromEnv = true
	}
	return resolved, &setting, nil
}

// LookupDatasheetPart resolves one part number: cache first, provider second.
// It is the only function that spends provider quota.
func LookupDatasheetPart(ctx context.Context, db *gorm.DB, rawQuery string, page, limit int, refresh bool) (*DatasheetLookup, error) {
	query := strings.TrimSpace(rawQuery)
	if query == "" {
		return nil, errors.New("a part number is required")
	}
	queryKey := DatasheetQueryKey(query)
	if queryKey == "" {
		return nil, fmt.Errorf("part number %q has no searchable characters", query)
	}

	settings, settingRow, err := LoadDatasheetSettings(db)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(settings.APIKey) == "" {
		return nil, ErrDatasheetNotConfigured
	}
	// Enabled is the master switch: off means no request leaves the server.
	if !settings.Enabled {
		return nil, errors.New("Datasheets.com lookups are disabled in the admin settings")
	}
	manual := isManualDatasheetLookup(ctx)

	if limit <= 0 {
		limit = settings.DefaultPageLimit
	}
	if limit > 10 {
		// The provider caps a page at 10 records.
		limit = 10
	}
	if page <= 0 {
		page = 1
	}

	remaining := settings.MonthlyLimit - datasheetMonthlyUsed(settingRow)
	if remaining < 0 {
		remaining = 0
	}

	if !refresh {
		if cached, _, ok := readDatasheetCache(db, queryKey, page, settings.CacheTTLDays); ok {
			cached.QuotaRemaining = remaining
			cached.QuotaLimit = settings.MonthlyLimit
			return cached, nil
		}
	}

	if err := datasheetRateGuard(ctx, settings, remaining, manual); err != nil {
		// A spent budget still answers with a stale copy: old data beats no data
		// when the administrator is trying to identify a part.
		if stale, age, ok := readDatasheetCacheIgnoreTTL(db, queryKey, page); ok {
			stale.CacheHit = true
			stale.CacheAge = age
			stale.QuotaRemaining = remaining
			stale.QuotaLimit = settings.MonthlyLimit
			stale.Notice = fmt.Sprintf("%v Cached copy from %s is shown instead.", err, age)
			return stale, nil
		}
		return nil, err
	}

	records, count, callErr := callDatasheetSearch(ctx, settings.APIKey, query, page, limit)
	now := time.Now()
	datasheetRecordCall(db, settingRow, query, callErr, count)
	if callErr != nil {
		if stale, age, ok := readDatasheetCacheIgnoreTTL(db, queryKey, page); ok {
			stale.CacheHit = true
			stale.CacheAge = age
			stale.QuotaRemaining = maxIntDatasheet(remaining-1, 0)
			stale.QuotaLimit = settings.MonthlyLimit
			stale.Notice = fmt.Sprintf("Datasheets.com call failed (%v). Cached copy from %s is shown instead.", callErr, age)
			return stale, nil
		}
		return nil, callErr
	}

	lookup := &DatasheetLookup{
		Query:          query,
		QueryKey:       queryKey,
		Page:           page,
		Limit:          limit,
		Count:          count,
		Records:        records,
		Attribution:    datasheetAttribution,
		FetchedAt:      now,
		QuotaLimit:     settings.MonthlyLimit,
		QuotaRemaining: maxIntDatasheet(remaining-1, 0),
	}
	for _, record := range records {
		if record.ExactMatch {
			lookup.ExactCount++
		}
	}
	if lookup.ExactCount == 0 && len(records) > 0 {
		lookup.Notice = "Datasheets.com returned only similar part numbers, none of which matches this part number exactly. Their values are shown for reference only."
	}

	writeDatasheetCache(db, queryKey, query, lookup, settings.CacheTTLDays)
	return lookup, nil
}

// DatasheetQueryKey normalises a part number for cache keys and exact matching.
// It keeps the hyphen/underscore distinction out of the way (3RV1742-5LD10 and
// 3RV17425LD10 are the same part) but never merges two different numbers, which
// is what decides whether values may be copied.
func DatasheetQueryKey(mpn string) string {
	mpn = strings.TrimSpace(strings.ToUpper(mpn))
	if mpn == "" {
		return ""
	}
	replacer := strings.NewReplacer(" ", "", "\t", "", "-", "", "_", "", "/", "", ".", "", "#", "")
	key := replacer.Replace(mpn)
	var b strings.Builder
	for _, r := range key {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '+' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func callDatasheetSearch(ctx context.Context, apiKey, query string, page, limit int) ([]DatasheetRecord, int, error) {
	endpoint := fmt.Sprintf("%s?q=%s&limit=%d&page=%d", datasheetAPIBaseURL, url.QueryEscape(query), limit, page)
	reqCtx, cancel := context.WithTimeout(ctx, datasheetCallTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", datasheetAPIUserAgent)

	resp, err := NewPublicHTTPClient(datasheetCallTimeout).Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("Datasheets.com request failed: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, 0, fmt.Errorf("Datasheets.com response could not be read: %w", err)
	}
	switch resp.StatusCode {
	case http.StatusOK:
	case http.StatusUnauthorized, http.StatusForbidden:
		return nil, 0, errors.New("Datasheets.com rejected the API key (401/403). Save a valid key in the admin settings")
	case http.StatusTooManyRequests:
		return nil, 0, errors.New("Datasheets.com rate limit reached (429). Wait a minute and try again")
	default:
		return nil, 0, fmt.Errorf("Datasheets.com returned HTTP %d: %s", resp.StatusCode, truncateDatasheetText(string(body), 200))
	}

	var raw datasheetRawResponse
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, 0, fmt.Errorf("Datasheets.com response was not valid JSON: %w", err)
	}
	queryKey := DatasheetQueryKey(query)
	records := make([]DatasheetRecord, 0, len(raw.Results))
	for _, item := range raw.Results {
		record := DatasheetRecord{
			MPN:          strings.TrimSpace(item.MPN),
			Manufacturer: strings.TrimSpace(item.Manufacturer),
			Title:        strings.TrimSpace(item.Title),
			Description:  strings.TrimSpace(item.Description),
			URL:          strings.TrimSpace(item.URL),
			Category1:    strings.TrimSpace(item.Category1),
			Category2:    strings.TrimSpace(item.Category2),
			Category3:    strings.TrimSpace(item.Category3),
			Category4:    strings.TrimSpace(item.Category4),
			PackageType:  strings.TrimSpace(item.PackageType),
			Lifecycle:    strings.TrimSpace(item.LifecycleStatus),
			DatasheetURL: strings.TrimSpace(item.DatasheetURL),
			ImageURL:     strings.TrimSpace(item.PrimaryImageURL),
			ExactMatch:   queryKey != "" && DatasheetQueryKey(item.MPN) == queryKey,
		}
		for _, spec := range item.Specs {
			name := strings.TrimSpace(spec.Name)
			value := strings.TrimSpace(spec.Value)
			if name == "" || value == "" {
				continue
			}
			record.Specs = append(record.Specs, DatasheetSpec{Name: name, Value: value})
			if len(record.Specs) >= datasheetSpecsPerRecordCap {
				break
			}
		}
		records = append(records, record)
	}
	return records, raw.Count, nil
}

// datasheetRateGuard mirrors the provider quota locally.
func datasheetRateGuard(ctx context.Context, settings DatasheetServiceSettings, remaining int, manual bool) error {
	stopAt := settings.MonthlyLimit
	if settings.AutoStopPercent > 0 {
		stopAt = settings.MonthlyLimit * settings.AutoStopPercent / 100
	}
	if remaining <= 0 {
		return &ErrDatasheetQuotaWaiting{
			Reason: fmt.Sprintf("The monthly Datasheets.com budget is spent (%d/%d calls). It resets at the start of next month, or raise the limit in the admin settings.",
				settings.MonthlyLimit-remaining, settings.MonthlyLimit),
		}
	}
	// The soft threshold only stops unattended work; an administrator watching
	// the result may keep going until the hard limit.
	if !manual && stopAt > 0 && remaining <= settings.MonthlyLimit-stopAt {
		return &ErrDatasheetQuotaWaiting{
			Reason: fmt.Sprintf("Automatic lookups stopped at %d%% of the monthly budget (%d calls left). Raise the limit to continue.",
				settings.AutoStopPercent, remaining),
		}
	}

	rdb := config.GetRedis()
	now := time.Now()
	minuteKey := "datasheets:rl:min:" + now.Format("200601021504")
	hourKey := "datasheets:rl:hour:" + now.Format("2006010215")
	if rdb != nil {
		pipe := rdb.Pipeline()
		minuteCmd := pipe.Incr(ctx, minuteKey)
		pipe.Expire(ctx, minuteKey, 2*time.Minute)
		hourCmd := pipe.Incr(ctx, hourKey)
		pipe.Expire(ctx, hourKey, 2*time.Hour)
		if _, err := pipe.Exec(ctx); err != nil {
			log.Printf("datasheet api: rate window unavailable, allowing one call: %v", err)
			return nil
		}
		if settings.PerMinuteLimit > 0 && int(minuteCmd.Val()) > settings.PerMinuteLimit {
			return &ErrDatasheetQuotaWaiting{
				Reason:     fmt.Sprintf("Local limit of %d lookups/minute reached. Wait a moment and retry.", settings.PerMinuteLimit),
				RetryAfter: 60 * time.Second,
			}
		}
		if settings.PerHourLimit > 0 && int(hourCmd.Val()) > settings.PerHourLimit {
			return &ErrDatasheetQuotaWaiting{
				Reason:     fmt.Sprintf("Local limit of %d lookups/hour reached. Wait and retry.", settings.PerHourLimit),
				RetryAfter: time.Minute,
			}
		}
		return nil
	}

	datasheetLocalWindow.mu.Lock()
	defer datasheetLocalWindow.mu.Unlock()
	if datasheetLocalWindow.minute != now.Format("200601021504") {
		datasheetLocalWindow.minute = now.Format("200601021504")
		datasheetLocalWindow.minuteCount = 0
	}
	if datasheetLocalWindow.hour != now.Format("2006010215") {
		datasheetLocalWindow.hour = now.Format("2006010215")
		datasheetLocalWindow.hourCount = 0
	}
	if settings.PerMinuteLimit > 0 && datasheetLocalWindow.minuteCount >= settings.PerMinuteLimit {
		return &ErrDatasheetQuotaWaiting{
			Reason:     fmt.Sprintf("Local limit of %d lookups/minute reached. Wait a moment and retry.", settings.PerMinuteLimit),
			RetryAfter: 60 * time.Second,
		}
	}
	if settings.PerHourLimit > 0 && datasheetLocalWindow.hourCount >= settings.PerHourLimit {
		return &ErrDatasheetQuotaWaiting{
			Reason:     fmt.Sprintf("Local limit of %d lookups/hour reached. Wait and retry.", settings.PerHourLimit),
			RetryAfter: time.Minute,
		}
	}
	datasheetLocalWindow.minuteCount++
	datasheetLocalWindow.hourCount++
	return nil
}

var datasheetLocalWindow = struct {
	mu          sync.Mutex
	minute      string
	minuteCount int
	hour        string
	hourCount   int
}{}

func datasheetMonthlyUsed(setting *models.DatasheetSetting) int {
	if setting == nil {
		return 0
	}
	if setting.QuotaMonth != time.Now().Format("2006-01") {
		return 0
	}
	return setting.MonthlyUsed
}

// datasheetRecordCall persists the call outcome and the monthly counter. It
// never fails a lookup that was already paid for.
func datasheetRecordCall(db *gorm.DB, setting *models.DatasheetSetting, query string, callErr error, resultCount int) {
	if db == nil || setting == nil || setting.ID == 0 {
		return
	}
	now := time.Now()
	month := now.Format("2006-01")
	used := setting.MonthlyUsed
	if setting.QuotaMonth != month {
		used = 0
	}
	updates := map[string]any{
		"last_call_at":    &now,
		"last_call_query": truncateDatasheetText(query, 160),
		"quota_month":     month,
		"monthly_used":    used + 1,
	}
	if callErr != nil {
		updates["last_call_status"] = 1
		updates["last_call_message"] = truncateDatasheetText(callErr.Error(), 400)
	} else {
		updates["last_call_status"] = 0
		updates["last_call_message"] = fmt.Sprintf("%d record(s) returned", resultCount)
	}
	if err := db.Model(&models.DatasheetSetting{}).Where("id = ?", setting.ID).Updates(updates).Error; err != nil {
		log.Printf("datasheet api: cannot update usage counters: %v", err)
	}
}

func readDatasheetCache(db *gorm.DB, queryKey string, page, ttlDays int) (*DatasheetLookup, string, bool) {
	if db == nil || ttlDays <= 0 || page != 1 {
		// Only page 1 is cached: deeper paging is rare and would double rows.
		return nil, "", false
	}
	var row models.DatasheetLookupCache
	if err := db.Where("query_key = ?", queryKey).First(&row).Error; err != nil {
		return nil, "", false
	}
	if row.ExpiresAt != nil && time.Now().After(*row.ExpiresAt) {
		return nil, "", false
	}
	lookup, age, ok := decodeDatasheetCacheRow(row, queryKey)
	if !ok {
		return nil, "", false
	}
	now := time.Now()
	if err := db.Model(&models.DatasheetLookupCache{}).Where("id = ?", row.ID).
		Updates(map[string]any{"last_hit_at": &now, "hit_count": gorm.Expr("hit_count + 1")}).Error; err != nil {
		log.Printf("datasheet api: cannot record cache hit: %v", err)
	}
	return lookup, age, true
}

func readDatasheetCacheIgnoreTTL(db *gorm.DB, queryKey string, page int) (*DatasheetLookup, string, bool) {
	if db == nil || page != 1 {
		return nil, "", false
	}
	var row models.DatasheetLookupCache
	if err := db.Where("query_key = ?", queryKey).First(&row).Error; err != nil {
		return nil, "", false
	}
	return decodeDatasheetCacheRow(row, queryKey)
}

func decodeDatasheetCacheRow(row models.DatasheetLookupCache, queryKey string) (*DatasheetLookup, string, bool) {
	if strings.TrimSpace(row.PayloadJSON) == "" {
		return nil, "", false
	}
	var lookup DatasheetLookup
	if err := json.Unmarshal([]byte(row.PayloadJSON), &lookup); err != nil {
		return nil, "", false
	}
	// Recompute the pure derivations so a cached payload can never report a
	// stale match count after the matching rules change.
	lookup.CacheHit = true
	lookup.CachedAt = &row.FetchedAt
	lookup.ExactCount = 0
	for i := range lookup.Records {
		lookup.Records[i].ExactMatch = lookup.Records[i].MPN != "" && DatasheetQueryKey(lookup.Records[i].MPN) == queryKey
		if lookup.Records[i].ExactMatch {
			lookup.ExactCount++
		}
	}
	age := humanizeDatasheetAge(time.Since(row.FetchedAt))
	lookup.CacheAge = age
	lookup.Attribution = datasheetAttribution
	return &lookup, age, true
}

func writeDatasheetCache(db *gorm.DB, queryKey, query string, lookup *DatasheetLookup, ttlDays int) {
	if db == nil || lookup == nil || lookup.Page != 1 {
		return
	}
	payload, err := json.Marshal(lookup)
	if err != nil {
		log.Printf("datasheet api: cannot serialise cache payload: %v", err)
		return
	}
	var expiresAt *time.Time
	if ttlDays > 0 {
		expiry := lookup.FetchedAt.Add(time.Duration(ttlDays) * 24 * time.Hour)
		expiresAt = &expiry
	}
	row := models.DatasheetLookupCache{QueryKey: queryKey}
	if err := db.Where("query_key = ?", queryKey).Assign(map[string]any{
		"mpn":          truncateDatasheetText(query, 160),
		"result_count": len(lookup.Records),
		"match_count":  lookup.ExactCount,
		"payload_json": string(payload),
		"fetched_at":   lookup.FetchedAt,
		"expires_at":   expiresAt,
	}).FirstOrCreate(&row).Error; err != nil {
		log.Printf("datasheet api: cannot store cache payload: %v", err)
	}
}

// DatasheetLookupToCandidates converts one record's parameters into review
// candidates. Only an exact match may produce them.
func DatasheetLookupToCandidates(record DatasheetRecord) []DatasheetCandidate {
	if !record.ExactMatch || len(record.Specs) == 0 {
		return nil
	}
	sourceURL := strings.TrimSpace(record.URL)
	if sourceURL == "" {
		sourceURL = datasheetAPIBaseURL + "?q=" + url.QueryEscape(record.MPN)
	}
	sourceTitle := datasheetAttribution
	if record.Manufacturer != "" {
		sourceTitle = fmt.Sprintf("%s · %s %s", datasheetAttribution, record.Manufacturer, record.MPN)
	}
	candidates := make([]DatasheetCandidate, 0, len(record.Specs))
	for _, spec := range record.Specs {
		candidates = append(candidates, DatasheetCandidate{
			Label:       CanonicalDatasheetLabel(spec.Name),
			Value:       spec.Value,
			SourceURL:   sourceURL,
			SourceTitle: sourceTitle,
			SourceType:  "datasheet-api",
			Evidence:    fmt.Sprintf("%s: %s", spec.Name, spec.Value),
			Origin:      "datasheet",
		})
	}
	return candidates
}

// DatasheetSuggestedProductFields returns the copyable catalogue fields of a
// record. They are shown to the administrator, never applied automatically.
func DatasheetSuggestedProductFields(record DatasheetRecord) map[string]string {
	suggestions := map[string]string{}
	if !record.ExactMatch {
		return suggestions
	}
	if v := strings.TrimSpace(record.DatasheetURL); v != "" {
		suggestions["datasheet_url"] = v
	}
	if v := strings.TrimSpace(record.Description); v != "" {
		suggestions["short_description"] = truncateDatasheetText(v, 500)
	}
	if v := strings.TrimSpace(record.Lifecycle); v != "" {
		suggestions["lifecycle_status"] = v
	}
	if v := strings.TrimSpace(record.PackageType); v != "" {
		suggestions["package_type"] = v
	}
	if v := strings.TrimSpace(record.Manufacturer); v != "" {
		suggestions["manufacturer"] = v
	}
	return suggestions
}

// DatasheetExactRecord finds the record whose part number matches exactly.
func DatasheetExactRecord(lookup *DatasheetLookup, wantMPN string) (DatasheetRecord, bool) {
	if lookup == nil {
		return DatasheetRecord{}, false
	}
	want := DatasheetQueryKey(wantMPN)
	if want == "" {
		return DatasheetBestExactRecord(lookup)
	}
	for _, record := range lookup.Records {
		if record.ExactMatch && DatasheetQueryKey(record.MPN) == want {
			return record, true
		}
	}
	return DatasheetRecord{}, false
}

// DatasheetBestExactRecord returns the first exact match, preferring one that
// actually carries parameters.
func DatasheetBestExactRecord(lookup *DatasheetLookup) (DatasheetRecord, bool) {
	if lookup == nil {
		return DatasheetRecord{}, false
	}
	var fallback *DatasheetRecord
	for i := range lookup.Records {
		record := lookup.Records[i]
		if !record.ExactMatch {
			continue
		}
		if len(record.Specs) > 0 {
			return record, true
		}
		if fallback == nil {
			copied := record
			fallback = &copied
		}
	}
	if fallback != nil {
		return *fallback, true
	}
	return DatasheetRecord{}, false
}

// DatasheetFilterCandidates keeps the labels the reviewer ticked. Values always
// come from the stored record, so a browser cannot inject a parameter the
// provider never published.
func DatasheetFilterCandidates(candidates []DatasheetCandidate, keep []DatasheetSpec) []DatasheetCandidate {
	if len(keep) == 0 {
		return candidates
	}
	allowed := make(map[string]struct{}, len(keep))
	for _, spec := range keep {
		label := CanonicalDatasheetLabel(spec.Name)
		value := strings.TrimSpace(spec.Value)
		if label == "" || value == "" {
			continue
		}
		allowed[datasheetCandidateKey(label, value)] = struct{}{}
	}
	filtered := make([]DatasheetCandidate, 0, len(candidates))
	for _, candidate := range candidates {
		if _, ok := allowed[datasheetCandidateKey(candidate.Label, candidate.Value)]; ok {
			filtered = append(filtered, candidate)
		}
	}
	return filtered
}

func datasheetCandidateKey(label, value string) string {
	return strings.ToLower(strings.TrimSpace(label)) + "\x00" + strings.TrimSpace(value)
}

// CanonicalDatasheetLabel tidies a provider parameter name into a stable label
// without renaming it beyond recognition: the same parameter must not appear
// twice in one table because of capitalisation or a trailing unit.
func CanonicalDatasheetLabel(label string) string {
	label = strings.Join(strings.Fields(strings.TrimSpace(label)), " ")
	if label == "" {
		return ""
	}
	// Known industrial families keep their catalogue spelling.
	switch strings.ToLower(label) {
	case "operating temperature", "operating temp", "temperature range":
		return "Operating temperature"
	case "voltage", "input voltage", "supply voltage", "rated voltage":
		return "Input voltage"
	case "current", "rated current", "output current":
		return "Rated current"
	case "power", "rated power", "output power":
		return "Rated power"
	case "weight", "net weight":
		return "Weight"
	case "dimensions", "size":
		return "Dimensions"
	case "mounting type", "mounting":
		return "Mounting type"
	case "interface", "communication interface":
		return "Interface"
	}
	// Otherwise title-case each word so "reverse recovery time" and "Reverse
	// Recovery Time" collapse into one row.
	words := strings.Fields(strings.ToLower(label))
	for i, word := range words {
		if word == "" {
			continue
		}
		words[i] = strings.ToUpper(word[:1]) + word[1:]
	}
	return strings.Join(words, " ")
}

// DatasheetAttributionText is the credit line the provider terms require.
func DatasheetAttributionText() string {
	return "Data from Datasheets.com — https://www.datasheets.com"
}

// WithManualDatasheetLookup marks a context as an explicit administrator
// lookup: the button they just pressed. It is allowed past the automatic-stop
// threshold but never past the hard monthly limit.
func WithManualDatasheetLookup(ctx context.Context) context.Context {
	return context.WithValue(ctx, datasheetManualLookupKey{}, true)
}

type datasheetManualLookupKey struct{}

func isManualDatasheetLookup(ctx context.Context) bool {
	if ctx == nil {
		return false
	}
	return ctx.Value(datasheetManualLookupKey{}) == true
}

// ParseDatasheetPageQuery reads the paging parameters of an admin lookup.
func ParseDatasheetPageQuery(pageRaw, limitRaw string) (int, int) {
	page, _ := strconv.Atoi(strings.TrimSpace(pageRaw))
	limit, _ := strconv.Atoi(strings.TrimSpace(limitRaw))
	return page, limit
}

func humanizeDatasheetAge(d time.Duration) string {
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		return fmt.Sprintf("%d minutes ago", int(d.Minutes()))
	case d < 24*time.Hour:
		return fmt.Sprintf("%d hours ago", int(d.Hours()))
	default:
		return fmt.Sprintf("%d days ago", int(d.Hours()/24))
	}
}

func truncateDatasheetText(value string, limit int) string {
	value = strings.TrimSpace(value)
	if limit <= 0 || len(value) <= limit {
		return value
	}
	return value[:limit] + "…"
}

func maxIntDatasheet(a, b int) int {
	if a > b {
		return a
	}
	return b
}
