package models

import (
	"time"
)

type Banner struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Title       string     `json:"title" gorm:"size:255;not null"`
	Subtitle    string     `json:"subtitle" gorm:"size:500"`
	Description string     `json:"description" gorm:"type:text"`
	ImageURL    string     `json:"image_url" gorm:"type:text;not null"`
	LinkURL     string     `json:"link_url" gorm:"size:500"`
	LinkText    string     `json:"link_text" gorm:"size:100"`
	Position    string     `json:"position" gorm:"size:50;default:'home'"`
	ContentType string     `json:"content_type" gorm:"size:50;default:'hero'"` // hero, category, warehouse
	CategoryKey string     `json:"category_key" gorm:"size:100"`               // For category items
	SortOrder   int        `json:"sort_order" gorm:"default:0"`
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type BannerCreateRequest struct {
	Title       string     `json:"title" binding:"required,max=255"`
	Subtitle    string     `json:"subtitle" binding:"max=500"`
	Description string     `json:"description"`
	ImageURL    string     `json:"image_url" binding:"required,url"`
	LinkURL     string     `json:"link_url" binding:"omitempty,url,max=500"`
	LinkText    string     `json:"link_text" binding:"max=100"`
	Position    string     `json:"position" binding:"required,oneof=home products about contact"`
	ContentType string     `json:"content_type" binding:"omitempty,oneof=hero category warehouse"`
	CategoryKey string     `json:"category_key" binding:"max=100"`
	SortOrder   int        `json:"sort_order"`
	IsActive    bool       `json:"is_active"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
}

type BannerUpdateRequest struct {
	Title       string     `json:"title" binding:"omitempty,max=255"`
	Subtitle    string     `json:"subtitle" binding:"max=500"`
	Description string     `json:"description"`
	ImageURL    string     `json:"image_url" binding:"omitempty,url"`
	LinkURL     string     `json:"link_url" binding:"omitempty,url,max=500"`
	LinkText    string     `json:"link_text" binding:"max=100"`
	Position    string     `json:"position" binding:"omitempty,oneof=home products about contact"`
	ContentType string     `json:"content_type" binding:"omitempty,oneof=hero category warehouse"`
	CategoryKey string     `json:"category_key" binding:"max=100"`
	SortOrder   *int       `json:"sort_order"`
	IsActive    *bool      `json:"is_active"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
}

type BannerResponse struct {
	ID          uint       `json:"id"`
	Title       string     `json:"title"`
	Subtitle    string     `json:"subtitle"`
	Description string     `json:"description"`
	ImageURL    string     `json:"image_url"`
	LinkURL     string     `json:"link_url"`
	LinkText    string     `json:"link_text"`
	Position    string     `json:"position"`
	ContentType string     `json:"content_type"`
	CategoryKey string     `json:"category_key"`
	SortOrder   int        `json:"sort_order"`
	IsActive    bool       `json:"is_active"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (b *Banner) ToResponse() BannerResponse {
	return BannerResponse{
		ID:          b.ID,
		Title:       b.Title,
		Subtitle:    b.Subtitle,
		Description: b.Description,
		ImageURL:    b.ImageURL,
		LinkURL:     b.LinkURL,
		LinkText:    b.LinkText,
		Position:    b.Position,
		ContentType: b.ContentType,
		CategoryKey: b.CategoryKey,
		SortOrder:   b.SortOrder,
		IsActive:    b.IsActive,
		StartDate:   b.StartDate,
		EndDate:     b.EndDate,
		CreatedAt:   b.CreatedAt,
		UpdatedAt:   b.UpdatedAt,
	}
}
