package models

import (
	"time"
)

type Order struct {
	ID              uint        `json:"id" gorm:"primaryKey"`
	OrderNumber     string      `json:"order_number" gorm:"type:varchar(100);uniqueIndex;not null"`

	// Customer reference (for registered customers)
	CustomerID      *uint       `json:"customer_id" gorm:"index"`
	Customer        *Customer   `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`

	// Admin user (for manual orders)
	UserID          *uint       `json:"user_id" gorm:"index"`
	User            *AdminUser  `json:"user,omitempty" gorm:"foreignKey:UserID"`

	CustomerEmail   string      `json:"customer_email" gorm:"type:varchar(255);not null"`
	CustomerName    string      `json:"customer_name" gorm:"type:varchar(255);not null"`
	CustomerPhone   string      `json:"customer_phone" gorm:"type:varchar(50)"`
	ShippingAddress string      `json:"shipping_address" gorm:"type:text"`
	BillingAddress  string      `json:"billing_address" gorm:"type:text"`
	Status          string      `json:"status" gorm:"type:varchar(50);default:'pending'"`         // pending, paid, shipped, delivered, cancelled
	PaymentStatus   string      `json:"payment_status" gorm:"type:varchar(50);default:'pending'"` // pending, paid, failed, refunded
	PaymentMethod   string      `json:"payment_method" gorm:"type:varchar(50)"`                   // paypal, stripe, etc.
	PaymentID       string      `json:"payment_id" gorm:"type:varchar(255)"`                      // External payment ID
	SubtotalAmount  float64     `json:"subtotal_amount" gorm:"not null"`                          // Amount before discounts
	DiscountAmount  float64     `json:"discount_amount" gorm:"default:0"`                         // Total discount applied
	TotalAmount     float64     `json:"total_amount" gorm:"not null"`                             // Final amount after discounts
	CouponCode      string      `json:"coupon_code" gorm:"type:varchar(50)"`                      // Applied coupon code
	CouponID        *uint       `json:"coupon_id" gorm:"index"`                                   // Applied coupon ID
	Coupon          *Coupon     `json:"coupon,omitempty" gorm:"foreignKey:CouponID"`              // Applied coupon details
	Currency        string      `json:"currency" gorm:"type:varchar(10);default:'USD'"`
	Notes           string      `json:"notes" gorm:"type:text"`
	Items           []OrderItem `json:"items,omitempty" gorm:"foreignKey:OrderID"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

type OrderItem struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	OrderID    uint      `json:"order_id" gorm:"not null;index"`
	Order      *Order    `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	ProductID  uint      `json:"product_id" gorm:"not null;index"`
	Product    *Product  `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	Quantity   int       `json:"quantity" gorm:"not null"`
	UnitPrice  float64   `json:"unit_price" gorm:"not null"`
	TotalPrice float64   `json:"total_price" gorm:"not null"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// PaymentTransaction represents a payment transaction
type PaymentTransaction struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	OrderID       uint      `json:"order_id" gorm:"not null;index"`
	Order         *Order    `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	TransactionID string    `json:"transaction_id" gorm:"type:varchar(255);uniqueIndex;not null"` // PayPal transaction ID
	PaymentMethod string    `json:"payment_method" gorm:"type:varchar(50);not null"`              // paypal, stripe, etc.
	Amount        float64   `json:"amount" gorm:"not null"`
	Currency      string    `json:"currency" gorm:"type:varchar(10);default:'USD'"`
	Status        string    `json:"status" gorm:"type:varchar(50);not null"` // pending, completed, failed, cancelled
	PayerID       string    `json:"payer_id" gorm:"type:varchar(255)"`
	PayerEmail    string    `json:"payer_email" gorm:"type:varchar(255)"`
	PaymentData   string    `json:"payment_data" gorm:"type:text"` // JSON data from payment provider
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
