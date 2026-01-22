package models

import "time"

// CloudflareCacheSetting stores Cloudflare purge credentials and automation settings.
//
// NOTE: ApiKeyEnc is stored encrypted (or otherwise protected) and is never returned via JSON.
// This is intended for Cloudflare Global API Key auth (X-Auth-Email + X-Auth-Key).
//
// We keep this as a single-row table (ID=1) to simplify admin configuration.
type CloudflareCacheSetting struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Email     string `json:"email" gorm:"size:255;default:''"`
	ApiKeyEnc string `json:"-" gorm:"type:text"`
	ZoneID    string `json:"zone_id" gorm:"size:64;default:'';index"`

	Enabled bool `json:"enabled" gorm:"default:false"`

	// AutoPurgeOnMutation triggers a purge automatically when admin content changes.
	AutoPurgeOnMutation bool `json:"auto_purge_on_mutation" gorm:"default:true"`

	// AutoClearRedisOnMutation controls whether we clear origin (Redis) cache when admin content changes.
	AutoClearRedisOnMutation bool `json:"auto_clear_redis_on_mutation" gorm:"default:true"`

	// AutoPurgeIntervalMinutes triggers a periodic purge when > 0.
	// This is useful when you want a safety net even if content changes happen elsewhere.
	AutoPurgeIntervalMinutes int `json:"auto_purge_interval_minutes" gorm:"default:0"`

	// PurgeEverything controls whether purges clear the entire zone cache.
	// If false, we will purge a small set of important URLs only.
	PurgeEverything bool `json:"purge_everything" gorm:"default:false"`

	LastPurgeAt *time.Time `json:"last_purge_at"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CloudflareCacheSettingResponse is a safe view for the admin UI.
// It does not contain ApiKeyEnc.
type CloudflareCacheSettingResponse struct {
	ID uint `json:"id"`

	Email     string `json:"email"`
	ZoneID    string `json:"zone_id"`
	Enabled   bool   `json:"enabled"`
	HasApiKey bool   `json:"has_api_key"`

	AutoPurgeOnMutation      bool `json:"auto_purge_on_mutation"`
	AutoClearRedisOnMutation bool `json:"auto_clear_redis_on_mutation"`
	AutoPurgeIntervalMinutes int  `json:"auto_purge_interval_minutes"`
	PurgeEverything          bool `json:"purge_everything"`

	LastPurgeAt *time.Time `json:"last_purge_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (s *CloudflareCacheSetting) ToResponse() CloudflareCacheSettingResponse {
	return CloudflareCacheSettingResponse{
		ID:                       s.ID,
		Email:                    s.Email,
		ZoneID:                   s.ZoneID,
		Enabled:                  s.Enabled,
		HasApiKey:                s.ApiKeyEnc != "",
		AutoPurgeOnMutation:      s.AutoPurgeOnMutation,
		AutoClearRedisOnMutation: s.AutoClearRedisOnMutation,
		AutoPurgeIntervalMinutes: s.AutoPurgeIntervalMinutes,
		PurgeEverything:          s.PurgeEverything,
		LastPurgeAt:              s.LastPurgeAt,
		UpdatedAt:                s.UpdatedAt,
		CreatedAt:                s.CreatedAt,
	}
}
