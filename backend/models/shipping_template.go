package models

import "time"

// ShippingTemplate defines shipping configuration for one country.
// It is composed of weight brackets and optional quote->surcharge rules.
type ShippingTemplate struct {
	ID uint `json:"id" gorm:"primaryKey"`

	CountryCode string `json:"country_code" gorm:"size:2;not null;uniqueIndex"`
	CountryName string `json:"country_name" gorm:"size:100;not null"`
	Currency    string `json:"currency" gorm:"size:10;not null;default:'USD'"`
	IsActive    bool   `json:"is_active" gorm:"default:true"`

	WeightBrackets  []ShippingWeightBracket  `json:"weight_brackets,omitempty" gorm:"foreignKey:TemplateID"`
	QuoteSurcharges []ShippingQuoteSurcharge `json:"quote_surcharges,omitempty" gorm:"foreignKey:TemplateID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ShippingWeightBracket struct {
	ID         uint `json:"id" gorm:"primaryKey"`
	TemplateID uint `json:"template_id" gorm:"not null;index"`

	MinKg     float64 `json:"min_kg" gorm:"not null;default:0"`
	MaxKg     float64 `json:"max_kg" gorm:"not null;default:0"`
	RatePerKg float64 `json:"rate_per_kg" gorm:"not null;default:0"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ShippingQuoteSurcharge struct {
	ID         uint `json:"id" gorm:"primaryKey"`
	TemplateID uint `json:"template_id" gorm:"not null;index"`

	QuoteAmount   float64 `json:"quote_amount" gorm:"not null;default:0"`
	AdditionalFee float64 `json:"additional_fee" gorm:"not null;default:0"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
