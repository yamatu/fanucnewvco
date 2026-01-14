package models

import (
	"time"
)

// HomepageContent represents content sections on the homepage
type HomepageContent struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	SectionKey  string    `json:"section_key" gorm:"type:varchar(255);uniqueIndex;not null"` // e.g., "workshop_facility", "hero_section"
	Title       string    `json:"title"`
	Subtitle    string    `json:"subtitle"`
	Description string    `json:"description" gorm:"type:text"`
	ImageURL    string    `json:"image_url"`
	ButtonText  string    `json:"button_text"`
	ButtonURL   string    `json:"button_url"`
	SortOrder   int       `json:"sort_order" gorm:"default:0"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// HomepageContentCreateRequest represents the request to create homepage content
type HomepageContentCreateRequest struct {
	SectionKey  string `json:"section_key" binding:"required"`
	Title       string `json:"title"`
	Subtitle    string `json:"subtitle"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url"`
	ButtonText  string `json:"button_text"`
	ButtonURL   string `json:"button_url"`
	SortOrder   int    `json:"sort_order"`
	IsActive    bool   `json:"is_active"`
}

// HomepageContentUpdateRequest represents the request to update homepage content
type HomepageContentUpdateRequest struct {
	Title       *string `json:"title"`
	Subtitle    *string `json:"subtitle"`
	Description *string `json:"description"`
	ImageURL    *string `json:"image_url"`
	ButtonText  *string `json:"button_text"`
	ButtonURL   *string `json:"button_url"`
	SortOrder   *int    `json:"sort_order"`
	IsActive    *bool   `json:"is_active"`
}

// HomepageSection represents predefined sections
type HomepageSection struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// GetPredefinedSections returns the list of predefined homepage sections
func GetPredefinedSections() []HomepageSection {
	return []HomepageSection{
		{
			Key:         "hero_section",
			Name:        "Hero Section",
			Description: "Main banner section at the top of the homepage",
		},
		{
			Key:         "workshop_facility",
			Name:        "Workshop Facility",
			Description: "5,000sqm Workshop Facility section",
		},
		{
			Key:         "workshop_overview",
			Name:        "Workshop Overview",
			Description: "Modern Facility overview",
		},
		{
			Key:         "inventory_management",
			Name:        "Inventory Management",
			Description: "Organized storage information",
		},
		{
			Key:         "quality_control",
			Name:        "Quality Control",
			Description: "Quality assurance information",
		},
		{
			Key:         "about_section",
			Name:        "About Section",
			Description: "Company information section",
		},
		{
			Key:         "services_section",
			Name:        "Services Section",
			Description: "Services overview section",
		},
		{
			Key:         "contact_section",
			Name:        "Contact Section",
			Description: "Contact information section",
		},
	}
}
