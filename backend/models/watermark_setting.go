package models

import "time"

// WatermarkSetting stores configuration for generating watermarked images.
// Single-row table (ID=1).
type WatermarkSetting struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Enabled bool `json:"enabled" gorm:"default:true"`

	// WatermarkPosition controls where the label is placed.
	// Supported: bottom-right (default), center, bottom-left, top-left, top-right.
	WatermarkPosition string `json:"watermark_position" gorm:"size:32;default:'bottom-right'"`

	// Base image comes from the Media Library.
	BaseMediaAssetID *uint       `json:"base_media_asset_id" gorm:"index"`
	BaseMediaAsset   *MediaAsset `json:"base_media_asset,omitempty" gorm:"foreignKey:BaseMediaAssetID"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
