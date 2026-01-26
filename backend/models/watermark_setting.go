package models

import "time"

// WatermarkSetting stores configuration for generating watermarked images.
// Single-row table (ID=1).
type WatermarkSetting struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Enabled bool `json:"enabled" gorm:"default:true"`

	// Base image comes from the Media Library.
	BaseMediaAssetID *uint       `json:"base_media_asset_id" gorm:"index"`
	BaseMediaAsset   *MediaAsset `json:"base_media_asset,omitempty" gorm:"foreignKey:BaseMediaAssetID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
