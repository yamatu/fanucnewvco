package models

import "time"

// ShippingAllowedCountry defines the whitelist of countries that can be shipped to.
// If this table has any rows, only countries in this table will be shown to customers.
// If the table is empty, all countries with active shipping templates are shown.
type ShippingAllowedCountry struct {
	ID uint `json:"id" gorm:"primaryKey"`

	CountryCode string `json:"country_code" gorm:"size:2;not null;uniqueIndex"`
	CountryName string `json:"country_name" gorm:"size:100;not null"`
	SortOrder   int    `json:"sort_order" gorm:"default:0"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
