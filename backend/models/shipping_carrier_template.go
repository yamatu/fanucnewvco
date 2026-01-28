package models

import "time"

// ShippingCarrierTemplate defines shipping configuration for one carrier/service + destination country.
// This keeps carrier-specific rates (e.g. FEDEX, DHL) separate from the generic country templates.
type ShippingCarrierTemplate struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Carrier     string `json:"carrier" gorm:"size:20;not null;uniqueIndex:ux_carrier_service_country,priority:1"`
	ServiceCode string `json:"service_code" gorm:"size:20;not null;default:'';uniqueIndex:ux_carrier_service_country,priority:2"`
	CountryCode string `json:"country_code" gorm:"size:2;not null;uniqueIndex:ux_carrier_service_country,priority:3"`
	CountryName string `json:"country_name" gorm:"size:100;not null"`
	Currency    string `json:"currency" gorm:"size:10;not null;default:'USD'"`
	IsActive    bool   `json:"is_active" gorm:"default:true"`

	WeightBrackets  []ShippingCarrierWeightBracket  `json:"weight_brackets,omitempty" gorm:"foreignKey:TemplateID"`
	QuoteSurcharges []ShippingCarrierQuoteSurcharge `json:"quote_surcharges,omitempty" gorm:"foreignKey:TemplateID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ShippingCarrierWeightBracket struct {
	ID         uint `json:"id" gorm:"primaryKey"`
	TemplateID uint `json:"template_id" gorm:"not null;index"`

	MinKg     float64 `json:"min_kg" gorm:"not null;default:0"`
	MaxKg     float64 `json:"max_kg" gorm:"not null;default:0"`
	RatePerKg float64 `json:"rate_per_kg" gorm:"not null;default:0"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ShippingCarrierQuoteSurcharge struct {
	ID         uint `json:"id" gorm:"primaryKey"`
	TemplateID uint `json:"template_id" gorm:"not null;index"`

	QuoteAmount   float64 `json:"quote_amount" gorm:"not null;default:0"`
	AdditionalFee float64 `json:"additional_fee" gorm:"not null;default:0"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
