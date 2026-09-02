package models

import "time"

// SocialMediaSetting stores the public social profile links displayed by the site.
// A blank URL disables that platform in the public footer and structured data.
type SocialMediaSetting struct {
	ID uint `json:"id" gorm:"primaryKey"`

	XURL         string `json:"x_url" gorm:"size:500;default:''"`
	FacebookURL  string `json:"facebook_url" gorm:"size:500;default:''"`
	InstagramURL string `json:"instagram_url" gorm:"size:500;default:''"`
	LinkedInURL  string `json:"linkedin_url" gorm:"size:500;default:''"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SocialMediaSettingRequest struct {
	XURL         string `json:"x_url"`
	FacebookURL  string `json:"facebook_url"`
	InstagramURL string `json:"instagram_url"`
	LinkedInURL  string `json:"linkedin_url"`
}
