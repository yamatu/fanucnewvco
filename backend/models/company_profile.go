package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// CompanyStats represents a single statistic item
type CompanyStats struct {
	Icon        string `json:"icon"`
	Value       string `json:"value"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

// WorkshopFacility represents a workshop facility item
type WorkshopFacility struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url"`
}

// CompanyStatsArray is a custom type for handling JSON array in database
type CompanyStatsArray []CompanyStats

// Value implements the driver.Valuer interface
func (c CompanyStatsArray) Value() (driver.Value, error) {
	return json.Marshal(c)
}

// Scan implements the sql.Scanner interface
func (c *CompanyStatsArray) Scan(value interface{}) error {
	if value == nil {
		*c = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, c)
}

// WorkshopFacilitiesArray is a custom type for handling JSON array in database
type WorkshopFacilitiesArray []WorkshopFacility

// Value implements the driver.Valuer interface
func (w WorkshopFacilitiesArray) Value() (driver.Value, error) {
	return json.Marshal(w)
}

// Scan implements the sql.Scanner interface
func (w *WorkshopFacilitiesArray) Scan(value interface{}) error {
	if value == nil {
		*w = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, w)
}

// StringArray is a custom type for handling JSON string array in database
type StringArray []string

// Value implements the driver.Valuer interface
func (s StringArray) Value() (driver.Value, error) {
	return json.Marshal(s)
}

// Scan implements the sql.Scanner interface
func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, s)
}

// CompanyProfile represents the company profile data
type CompanyProfile struct {
	ID                 uint                    `json:"id" gorm:"primaryKey"`
	CompanyName        string                  `json:"company_name" gorm:"size:100;not null"`
	CompanySubtitle    string                  `json:"company_subtitle" gorm:"size:200"`
	EstablishmentYear  string                  `json:"establishment_year" gorm:"size:10"`
	Location           string                  `json:"location" gorm:"size:200"`
	WorkshopSize       string                  `json:"workshop_size" gorm:"size:50"`
	Description1       string                  `json:"description_1" gorm:"type:text"`
	Description2       string                  `json:"description_2" gorm:"type:text"`
	Achievement        string                  `json:"achievement" gorm:"size:200"`
	Stats              CompanyStatsArray       `json:"stats" gorm:"type:json"`
	Expertise          StringArray             `json:"expertise" gorm:"type:json"`
	WorkshopFacilities WorkshopFacilitiesArray `json:"workshop_facilities" gorm:"type:json"`
	CreatedAt          time.Time               `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt          time.Time               `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for CompanyProfile
func (CompanyProfile) TableName() string {
	return "company_profiles"
}

// CompanyProfileRequest represents the request payload for creating/updating company profile
type CompanyProfileRequest struct {
	CompanyName        string             `json:"company_name" binding:"required"`
	CompanySubtitle    string             `json:"company_subtitle"`
	EstablishmentYear  string             `json:"establishment_year"`
	Location           string             `json:"location"`
	WorkshopSize       string             `json:"workshop_size"`
	Description1       string             `json:"description_1"`
	Description2       string             `json:"description_2"`
	Achievement        string             `json:"achievement"`
	Stats              []CompanyStats     `json:"stats"`
	Expertise          []string           `json:"expertise"`
	WorkshopFacilities []WorkshopFacility `json:"workshop_facilities"`
}

// ToCompanyProfile converts CompanyProfileRequest to CompanyProfile
func (r *CompanyProfileRequest) ToCompanyProfile() *CompanyProfile {
	return &CompanyProfile{
		CompanyName:        r.CompanyName,
		CompanySubtitle:    r.CompanySubtitle,
		EstablishmentYear:  r.EstablishmentYear,
		Location:           r.Location,
		WorkshopSize:       r.WorkshopSize,
		Description1:       r.Description1,
		Description2:       r.Description2,
		Achievement:        r.Achievement,
		Stats:              CompanyStatsArray(r.Stats),
		Expertise:          StringArray(r.Expertise),
		WorkshopFacilities: WorkshopFacilitiesArray(r.WorkshopFacilities),
	}
}

// CompanyProfileResponse represents the response format for company profile
type CompanyProfileResponse struct {
	ID                 uint               `json:"id"`
	CompanyName        string             `json:"company_name"`
	CompanySubtitle    string             `json:"company_subtitle"`
	EstablishmentYear  string             `json:"establishment_year"`
	Location           string             `json:"location"`
	WorkshopSize       string             `json:"workshop_size"`
	Description1       string             `json:"description_1"`
	Description2       string             `json:"description_2"`
	Achievement        string             `json:"achievement"`
	Stats              []CompanyStats     `json:"stats"`
	Expertise          []string           `json:"expertise"`
	WorkshopFacilities []WorkshopFacility `json:"workshop_facilities"`
	CreatedAt          time.Time          `json:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at"`
}

// ToResponse converts CompanyProfile to CompanyProfileResponse
func (c *CompanyProfile) ToResponse() *CompanyProfileResponse {
	return &CompanyProfileResponse{
		ID:                 c.ID,
		CompanyName:        c.CompanyName,
		CompanySubtitle:    c.CompanySubtitle,
		EstablishmentYear:  c.EstablishmentYear,
		Location:           c.Location,
		WorkshopSize:       c.WorkshopSize,
		Description1:       c.Description1,
		Description2:       c.Description2,
		Achievement:        c.Achievement,
		Stats:              []CompanyStats(c.Stats),
		Expertise:          []string(c.Expertise),
		WorkshopFacilities: []WorkshopFacility(c.WorkshopFacilities),
		CreatedAt:          c.CreatedAt,
		UpdatedAt:          c.UpdatedAt,
	}
}
