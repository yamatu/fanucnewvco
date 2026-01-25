package models

import (
	"time"
)

// Customer represents a registered customer/user
type Customer struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Email    string `json:"email" gorm:"size:255;uniqueIndex;not null"`
	Password string `json:"-" gorm:"size:255;not null"` // Never expose password in JSON
	FullName string `json:"full_name" gorm:"size:255;not null"`
	Phone    string `json:"phone" gorm:"size:50"`
	Company  string `json:"company" gorm:"size:255"`

	// Address information
	Address    string `json:"address" gorm:"type:text"`
	City       string `json:"city" gorm:"size:100"`
	State      string `json:"state" gorm:"size:100"`
	Country    string `json:"country" gorm:"size:100;default:'China'"`
	PostalCode string `json:"postal_code" gorm:"size:20"`

	// Account status
	IsActive   bool `json:"is_active" gorm:"default:true;index"`
	IsVerified bool `json:"is_verified" gorm:"default:false"`

	// Metadata
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Relations
	Orders  []Order  `json:"orders,omitempty" gorm:"foreignKey:CustomerID"`
	Tickets []Ticket `json:"tickets,omitempty" gorm:"foreignKey:CustomerID"`
}

// CustomerRegisterRequest represents the registration payload
type CustomerRegisterRequest struct {
	Email     string `json:"email" binding:"required,email"`
	EmailCode string `json:"email_code"`
	Password  string `json:"password" binding:"required,min=6"`
	FullName  string `json:"full_name" binding:"required"`
	Phone     string `json:"phone"`
	Company   string `json:"company"`
}

// CustomerLoginRequest represents the login payload
type CustomerLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// CustomerLoginResponse represents the login response
type CustomerLoginResponse struct {
	Token    string   `json:"token"`
	Customer Customer `json:"customer"`
}

// CustomerProfileUpdateRequest represents profile update payload
type CustomerProfileUpdateRequest struct {
	FullName   string `json:"full_name"`
	Phone      string `json:"phone"`
	Company    string `json:"company"`
	Address    string `json:"address"`
	City       string `json:"city"`
	State      string `json:"state"`
	Country    string `json:"country"`
	PostalCode string `json:"postal_code"`
}

// CustomerPasswordChangeRequest represents password change payload
type CustomerPasswordChangeRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}
