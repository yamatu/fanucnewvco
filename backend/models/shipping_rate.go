package models

import "time"

// ShippingRate defines a flat shipping fee per country.
type ShippingRate struct {
	ID uint `json:"id" gorm:"primaryKey"`

	CountryCode string  `json:"country_code" gorm:"size:2;not null;uniqueIndex"` // ISO 3166-1 alpha-2
	CountryName string  `json:"country_name" gorm:"size:100;not null"`
	Fee         float64 `json:"fee" gorm:"not null;default:0"`
	Currency    string  `json:"currency" gorm:"size:10;not null;default:'USD'"`
	IsActive    bool    `json:"is_active" gorm:"default:true"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
