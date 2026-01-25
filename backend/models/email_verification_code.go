package models

import "time"

// EmailVerificationCode stores short-lived verification codes.
// CodeHash is a bcrypt hash of the code.
type EmailVerificationCode struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Email   string `json:"email" gorm:"size:255;index;not null"`
	Purpose string `json:"purpose" gorm:"size:32;index;not null"` // register | reset

	CodeHash  string     `json:"-" gorm:"size:255;not null"`
	ExpiresAt time.Time  `json:"expires_at" gorm:"index;not null"`
	UsedAt    *time.Time `json:"used_at" gorm:"index"`

	CreatedAt time.Time `json:"created_at"`
}
