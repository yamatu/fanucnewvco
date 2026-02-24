package models

import "time"

// ShippingFreeSetting controls which countries have free shipping enabled.
type ShippingFreeSetting struct {
	ID                  uint      `json:"id" gorm:"primaryKey"`
	CountryCode         string    `json:"country_code" gorm:"size:2;not null;uniqueIndex"`
	CountryName         string    `json:"country_name" gorm:"size:100;not null"`
	FreeShippingEnabled bool      `json:"free_shipping_enabled" gorm:"default:false"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}
