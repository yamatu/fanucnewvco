package models

import "time"

// PayPalSetting stores PayPal configuration.
//
// This is a single-row table (ID=1) so the admin UI can update it easily.
// We only store Client IDs here (not secrets). Client IDs are public by nature
// and are required on the frontend to load the PayPal JS SDK.
type PayPalSetting struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Enabled bool `json:"enabled" gorm:"default:false"`

	// Mode selects which Client ID is used.
	// Allowed: "sandbox" | "live"
	Mode string `json:"mode" gorm:"size:16;default:'sandbox'"`

	ClientIDSandbox string `json:"client_id_sandbox" gorm:"size:255;default:''"`
	ClientIDLive    string `json:"client_id_live" gorm:"size:255;default:''"`

	Currency string `json:"currency" gorm:"size:10;default:'USD'"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *PayPalSetting) EffectiveClientID() string {
	if s == nil {
		return ""
	}
	if s.Mode == "live" {
		return s.ClientIDLive
	}
	return s.ClientIDSandbox
}

type PayPalPublicConfig struct {
	Enabled  bool   `json:"enabled"`
	Mode     string `json:"mode"`
	ClientID string `json:"client_id"`
	Currency string `json:"currency"`
}

func (s *PayPalSetting) ToPublicConfig() PayPalPublicConfig {
	mode := s.Mode
	if mode != "live" {
		mode = "sandbox"
	}
	cur := s.Currency
	if cur == "" {
		cur = "USD"
	}
	return PayPalPublicConfig{
		Enabled:  s.Enabled,
		Mode:     mode,
		ClientID: s.EffectiveClientID(),
		Currency: cur,
	}
}
