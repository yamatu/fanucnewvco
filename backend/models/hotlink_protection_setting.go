package models

import "time"

// HotlinkProtectionSetting controls anti-hotlinking for /uploads/*.
// This is best-effort at the origin; if Cloudflare caches images at the edge,
// configure hotlink protection at the CDN as well.
//
// Single-row table (ID=1).
type HotlinkProtectionSetting struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Enabled bool `json:"enabled" gorm:"default:false"`

	// AllowedHosts is a comma-separated list of allowed referer/origin hosts.
	// Example: "www.example.com,example.com"
	AllowedHosts string `json:"allowed_hosts" gorm:"type:text"`

	// AllowEmptyReferer allows requests with no Referer/Origin header.
	// Some privacy settings and browsers omit Referer.
	AllowEmptyReferer bool `json:"allow_empty_referer" gorm:"default:true"`

	// AllowSameHost allows same-host access even if not in AllowedHosts.
	AllowSameHost bool `json:"allow_same_host" gorm:"default:true"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type HotlinkProtectionSettingResponse struct {
	ID                uint      `json:"id"`
	Enabled           bool      `json:"enabled"`
	AllowedHosts      string    `json:"allowed_hosts"`
	AllowEmptyReferer bool      `json:"allow_empty_referer"`
	AllowSameHost     bool      `json:"allow_same_host"`
	UpdatedAt         time.Time `json:"updated_at"`
	CreatedAt         time.Time `json:"created_at"`
}

func (s *HotlinkProtectionSetting) ToResponse() HotlinkProtectionSettingResponse {
	return HotlinkProtectionSettingResponse{
		ID:                s.ID,
		Enabled:           s.Enabled,
		AllowedHosts:      s.AllowedHosts,
		AllowEmptyReferer: s.AllowEmptyReferer,
		AllowSameHost:     s.AllowSameHost,
		UpdatedAt:         s.UpdatedAt,
		CreatedAt:         s.CreatedAt,
	}
}
