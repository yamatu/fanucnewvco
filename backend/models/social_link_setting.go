package models

import "time"

// SocialLinkSetting stores the public social profiles displayed by the site.
// It is a single-row table (ID=1) managed from the admin settings page.
type SocialLinkSetting struct {
	ID uint `json:"id" gorm:"primaryKey"`

	ShowInFooter bool `json:"show_in_footer" gorm:"default:true"`

	XURL         string `json:"x_url" gorm:"size:500;default:''"`
	FacebookURL  string `json:"facebook_url" gorm:"size:500;default:''"`
	InstagramURL string `json:"instagram_url" gorm:"size:500;default:''"`
	LinkedInURL  string `json:"linkedin_url" gorm:"size:500;default:''"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SocialLinksPublicConfig struct {
	ShowInFooter bool   `json:"show_in_footer"`
	XURL         string `json:"x_url"`
	FacebookURL  string `json:"facebook_url"`
	InstagramURL string `json:"instagram_url"`
	LinkedInURL  string `json:"linkedin_url"`
}

func (s *SocialLinkSetting) ToPublicConfig() SocialLinksPublicConfig {
	if s == nil {
		return SocialLinksPublicConfig{}
	}

	return SocialLinksPublicConfig{
		ShowInFooter: s.ShowInFooter,
		XURL:         s.XURL,
		FacebookURL:  s.FacebookURL,
		InstagramURL: s.InstagramURL,
		LinkedInURL:  s.LinkedInURL,
	}
}
