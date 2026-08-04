package models

import (
	"time"
)

type Order struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	OrderNumber string `json:"order_number" gorm:"type:varchar(100);uniqueIndex;not null"`

	// Customer reference (for registered customers)
	CustomerID *uint     `json:"customer_id" gorm:"index"`
	Customer   *Customer `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`

	// Admin user (for manual orders)
	UserID *uint      `json:"user_id" gorm:"index"`
	User   *AdminUser `json:"user,omitempty" gorm:"foreignKey:UserID"`

	CustomerEmail   string     `json:"customer_email" gorm:"type:varchar(255);not null"`
	CustomerName    string     `json:"customer_name" gorm:"type:varchar(255);not null"`
	CustomerPhone   string     `json:"customer_phone" gorm:"type:varchar(50)"`
	ShippingAddress string     `json:"shipping_address" gorm:"type:text"`
	BillingAddress  string     `json:"billing_address" gorm:"type:text"`
	Status          string     `json:"status" gorm:"type:varchar(50);default:'pending'"`         // pending, paid, shipped, delivered, cancelled
	PaymentStatus   string     `json:"payment_status" gorm:"type:varchar(50);default:'pending'"` // pending, paid, failed, refund_pending, partially_refunded, refunded
	PaymentMethod   string     `json:"payment_method" gorm:"type:varchar(50)"`                   // paypal, stripe, etc.
	PaymentID       string     `json:"payment_id" gorm:"type:varchar(255)"`                      // External payment ID
	RefundedAmount  float64    `json:"refunded_amount" gorm:"type:decimal(10,2);default:0"`
	RefundedAt      *time.Time `json:"refunded_at"`
	StockRestoredAt *time.Time `json:"stock_restored_at"`

	// Shipping
	TrackingNumber     string      `json:"tracking_number" gorm:"type:varchar(255)"`
	ShippingCarrier    string      `json:"shipping_carrier" gorm:"type:varchar(100)"`
	ShippingCountry    string      `json:"shipping_country" gorm:"type:varchar(2)"` // ISO 3166-1 alpha-2
	ShippingFee        float64     `json:"shipping_fee" gorm:"default:0"`
	ShippedAt          *time.Time  `json:"shipped_at"`
	ShippedEmailSentAt *time.Time  `json:"shipped_email_sent_at"`
	SubtotalAmount     float64     `json:"subtotal_amount" gorm:"not null"`             // Amount before discounts
	DiscountAmount     float64     `json:"discount_amount" gorm:"default:0"`            // Total discount applied
	TotalAmount        float64     `json:"total_amount" gorm:"not null"`                // Final amount after discounts
	CouponCode         string      `json:"coupon_code" gorm:"type:varchar(50)"`         // Applied coupon code
	CouponID           *uint       `json:"coupon_id" gorm:"index"`                      // Applied coupon ID
	Coupon             *Coupon     `json:"coupon,omitempty" gorm:"foreignKey:CouponID"` // Applied coupon details
	Currency           string      `json:"currency" gorm:"type:varchar(10);default:'USD'"`
	Notes              string      `json:"notes" gorm:"type:text"`
	Items              []OrderItem `json:"items,omitempty" gorm:"foreignKey:OrderID"`
	Refunds            []Refund    `json:"refunds,omitempty" gorm:"foreignKey:OrderID"`
	CreatedAt          time.Time   `json:"created_at"`
	UpdatedAt          time.Time   `json:"updated_at"`
}

// Refund records each provider refund attempt and its final state.
type Refund struct {
	ID                   uint                `json:"id" gorm:"primaryKey"`
	OrderID              uint                `json:"order_id" gorm:"not null;index"`
	Order                *Order              `json:"order,omitempty" gorm:"foreignKey:OrderID"`
	PaymentTransactionID *uint               `json:"payment_transaction_id" gorm:"index"`
	PaymentTransaction   *PaymentTransaction `json:"payment_transaction,omitempty" gorm:"foreignKey:PaymentTransactionID"`
	ProviderRefundID     string              `json:"provider_refund_id" gorm:"size:255;index"`
	CaptureID            string              `json:"capture_id" gorm:"size:255;index;not null"`
	Amount               float64             `json:"amount" gorm:"type:decimal(10,2);not null"`
	Currency             string              `json:"currency" gorm:"size:10;not null"`
	Reason               string              `json:"reason" gorm:"size:500"`
	Status               string              `json:"status" gorm:"size:32;not null;index"`
	ProviderResponse     string              `json:"-" gorm:"type:longtext"`
	RequestedBy          *uint               `json:"requested_by" gorm:"index"`
	CreatedAt            time.Time           `json:"created_at"`
	UpdatedAt            time.Time           `json:"updated_at"`
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
