package models

import "time"

// DatasheetSetting is the single persisted configuration row for the
// Datasheets.com product search API.
//
// Two rules shape it:
//   - the API key is encrypted at rest and never leaves Go,
//   - the monthly counter lives here because the provider quota belongs to the
//     account, not to the process: a restart must not hand us another 5,000
//     calls.
type DatasheetSetting struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Enabled bool `json:"enabled" gorm:"default:false"`

	// APIKeyEnc holds utils.EncryptSecret(api key). Never serialised.
	APIKeyEnc     string `json:"-" gorm:"type:text"`
	APIKeyFromEnv bool   `json:"api_key_from_env" gorm:"default:false"`

	PerMinuteLimit int `json:"per_minute_limit" gorm:"default:60"`
	PerHourLimit   int `json:"per_hour_limit" gorm:"default:500"`
	MonthlyLimit   int `json:"monthly_limit" gorm:"default:5000"`

	// Automatic lookups stop at AutoStopPercent of MonthlyLimit. A lookup an
	// administrator starts by hand is allowed up to the hard limit.
	AutoStopPercent int `json:"auto_stop_percent" gorm:"default:90"`

	CacheTTLDays     int `json:"cache_ttl_days" gorm:"default:90"`
	DefaultPageLimit int `json:"default_page_limit" gorm:"default:10"`

	QuotaMonth      string     `json:"quota_month" gorm:"size:7;default:''"`
	MonthlyUsed     int        `json:"monthly_used" gorm:"default:0"`
	QuotaResetAt    *time.Time `json:"quota_reset_at,omitempty"`
	LastCallAt      *time.Time `json:"last_call_at,omitempty"`
	LastCallStatus  int        `json:"last_call_status" gorm:"default:0"`
	LastCallQuery   string     `json:"last_call_query" gorm:"size:160;default:''"`
	LastCallMessage string     `json:"last_call_message" gorm:"type:text"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// DatasheetSettingResponse is the browser-safe projection.
type DatasheetSettingResponse struct {
	ID      uint `json:"id"`
	Enabled bool `json:"enabled"`

	HasAPIKey     bool `json:"has_api_key"`
	APIKeyFromEnv bool `json:"api_key_from_env"`

	PerMinuteLimit   int `json:"per_minute_limit"`
	PerHourLimit     int `json:"per_hour_limit"`
	MonthlyLimit     int `json:"monthly_limit"`
	AutoStopPercent  int `json:"auto_stop_percent"`
	CacheTTLDays     int `json:"cache_ttl_days"`
	DefaultPageLimit int `json:"default_page_limit"`

	QuotaMonth       string     `json:"quota_month"`
	MonthlyUsed      int        `json:"monthly_used"`
	MonthlyRemaining int        `json:"monthly_remaining"`
	QuotaResetAt     *time.Time `json:"quota_reset_at,omitempty"`
	LastCallAt       *time.Time `json:"last_call_at,omitempty"`
	LastCallStatus   int        `json:"last_call_status"`
	LastCallQuery    string     `json:"last_call_query"`
	LastCallMessage  string     `json:"last_call_message"`

	UpdatedAt time.Time `json:"updated_at"`
}

// ToResponse projects the row for the admin UI.
func (s *DatasheetSetting) ToResponse() DatasheetSettingResponse {
	remaining := s.MonthlyLimit - s.MonthlyUsed
	if remaining < 0 {
		remaining = 0
	}
	return DatasheetSettingResponse{
		ID:               s.ID,
		Enabled:          s.Enabled,
		HasAPIKey:        s.APIKeyFromEnv || s.APIKeyEnc != "",
		APIKeyFromEnv:    s.APIKeyFromEnv,
		PerMinuteLimit:   s.PerMinuteLimit,
		PerHourLimit:     s.PerHourLimit,
		MonthlyLimit:     s.MonthlyLimit,
		AutoStopPercent:  s.AutoStopPercent,
		CacheTTLDays:     s.CacheTTLDays,
		DefaultPageLimit: s.DefaultPageLimit,
		QuotaMonth:       s.QuotaMonth,
		MonthlyUsed:      s.MonthlyUsed,
		MonthlyRemaining: remaining,
		QuotaResetAt:     s.QuotaResetAt,
		LastCallAt:       s.LastCallAt,
		LastCallStatus:   s.LastCallStatus,
		LastCallQuery:    s.LastCallQuery,
		LastCallMessage:  s.LastCallMessage,
		UpdatedAt:        s.UpdatedAt,
	}
}

// DatasheetLookupCache keeps one provider answer per normalised part number so a
// repeated lookup costs nothing.
type DatasheetLookupCache struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	QueryKey string `json:"query_key" gorm:"size:160;uniqueIndex"`
	MPN      string `json:"mpn" gorm:"size:160"`

	ResultCount int        `json:"result_count" gorm:"default:0"`
	MatchCount  int        `json:"match_count" gorm:"default:0"`
	PayloadJSON string     `json:"payload_json" gorm:"type:mediumtext"`
	FetchedAt   time.Time  `json:"fetched_at" gorm:"index"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty" gorm:"index"`
	LastHitAt   *time.Time `json:"last_hit_at,omitempty"`
	HitCount    int        `json:"hit_count" gorm:"default:0"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ProductDatasheetDraft is the review queue for parameters copied from a
// Datasheets.com record.
//
// This site did not have the model-number research pipeline, so the queue is
// introduced here in its minimal form: one row per import, the source URL kept
// with every value, and status that only an administrator can move to
// "approved". Approval is what writes Product.TechnicalSpecs.
type ProductDatasheetDraft struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	ProductID uint   `json:"product_id" gorm:"index"`
	SKU       string `json:"sku,omitempty" gorm:"size:120;index"`
	Brand     string `json:"brand,omitempty" gorm:"size:120;index"`
	Model     string `json:"model" gorm:"size:160;index"`
	// Status is pending | approved | rejected | superseded.
	Status string `json:"status" gorm:"size:24;index"`
	// Source is the provider record the parameters were copied from.
	SourceMPN      string     `json:"source_mpn" gorm:"size:160"`
	SourceURL      string     `json:"source_url" gorm:"size:500"`
	SourceTitle    string     `json:"source_title" gorm:"size:255"`
	SpecsJSON      string     `json:"specs_json" gorm:"type:json"`
	CandidatesJSON string     `json:"candidates_json" gorm:"type:json"`
	Notes          string     `json:"notes,omitempty" gorm:"type:text"`
	RequestedBy    uint       `json:"requested_by,omitempty"`
	ReviewedBy     uint       `json:"reviewed_by,omitempty"`
	ReviewedAt     *time.Time `json:"reviewed_at,omitempty"`
	AppliedAt      *time.Time `json:"applied_at,omitempty"`
	RejectReason   string     `json:"reject_reason,omitempty" gorm:"type:text"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
