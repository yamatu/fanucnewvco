package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
)

type OrderController struct{}

// OrderCreateRequest matches frontend request format
type OrderCreateRequest struct {
	CustomerEmail   string `json:"customer_email" binding:"required,email"`
	CustomerName    string `json:"customer_name" binding:"required"`
	CustomerPhone   string `json:"customer_phone"`
	ShippingAddress string `json:"shipping_address" binding:"required"`
	BillingAddress  string `json:"billing_address" binding:"required"`
	Notes           string `json:"notes"`
	CouponCode      string `json:"coupon_code"` // Optional coupon code
	Items           []struct {
		ProductID uint    `json:"product_id" binding:"required"`
		Quantity  int     `json:"quantity" binding:"required,min=1"`
		UnitPrice float64 `json:"unit_price" binding:"required,min=0"`
	} `json:"items" binding:"required,min=1"`
}

// PaymentRequest matches frontend payment request format
type PaymentRequest struct {
	PaymentMethod string      `json:"payment_method" binding:"required"`
	PaymentData   interface{} `json:"payment_data"`
}

// CreateOrder creates a new order
func (oc *OrderController) CreateOrder(c *gin.Context) {
	var req OrderCreateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	// Generate order number
	orderNumber := fmt.Sprintf("ORD-%d", time.Now().Unix())

	// Calculate total amount and validate products
	var subtotalAmount float64
	var orderItems []models.OrderItem

	for _, item := range req.Items {
		var product models.Product
		if err := config.DB.First(&product, item.ProductID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": fmt.Sprintf("Product with ID %d not found", item.ProductID),
			})
			return
		}

		// Check stock
		if product.StockQuantity < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": fmt.Sprintf("Insufficient stock for product %s", product.Name),
			})
			return
		}

		// Use price from frontend if provided, otherwise use product price
		unitPrice := item.UnitPrice
		if unitPrice <= 0 {
			unitPrice = product.Price
		}

		itemTotal := unitPrice * float64(item.Quantity)
		subtotalAmount += itemTotal

		orderItems = append(orderItems, models.OrderItem{
			ProductID:  item.ProductID,
			Quantity:   item.Quantity,
			UnitPrice:  unitPrice,
			TotalPrice: itemTotal,
		})
	}

	// Initialize amounts
	discountAmount := 0.0
	totalAmount := subtotalAmount
	var couponID *uint

	// Apply coupon if provided
	if req.CouponCode != "" {
		couponController := &CouponController{}
		couponResponse, err := couponController.ApplyCoupon(config.DB, req.CouponCode, 0, subtotalAmount, req.CustomerEmail)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to validate coupon",
				"error":   err.Error(),
			})
			return
		}

		if couponResponse != nil {
			if !couponResponse.Valid {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": couponResponse.Message,
				})
				return
			}

			discountAmount = couponResponse.DiscountAmount
			totalAmount = couponResponse.FinalAmount
			couponID = &couponResponse.CouponID
		}
	}

	// Create order
	order := models.Order{
		OrderNumber:     orderNumber,
		CustomerEmail:   req.CustomerEmail,
		CustomerName:    req.CustomerName,
		CustomerPhone:   req.CustomerPhone,
		ShippingAddress: req.ShippingAddress,
		BillingAddress:  req.BillingAddress,
		Status:          "pending",
		PaymentStatus:   "pending",
		PaymentMethod:   "", // Will be set during payment
		SubtotalAmount:  subtotalAmount,
		DiscountAmount:  discountAmount,
		TotalAmount:     totalAmount,
		CouponCode:      req.CouponCode,
		CouponID:        couponID,
		Currency:        "USD",
		Notes:           req.Notes,
		Items:           orderItems,
	}

	// Get customer ID if authenticated as customer
	if customerID, exists := c.Get("customer_id"); exists {
		if cid, ok := customerID.(uint); ok {
			order.CustomerID = &cid
		}
	}

	// Get user ID if authenticated as admin
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(uint); ok {
			order.UserID = &uid
		}
	}

	if err := config.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create order",
		})
		return
	}

	// Apply coupon usage if coupon was used
	if req.CouponCode != "" && couponID != nil {
		couponController := &CouponController{}
		couponController.ApplyCoupon(config.DB, req.CouponCode, order.ID, subtotalAmount, req.CustomerEmail)
	}

	// Load order with items, products, and coupon
	config.DB.Preload("Items.Product").Preload("User").Preload("Coupon").First(&order, order.ID)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Order created successfully",
		"data":    order,
	})
}

// ProcessPayment processes PayPal payment
func (oc *OrderController) ProcessPayment(c *gin.Context) {
	orderID := c.Param("id")

	var req PaymentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	// Find order
	var order models.Order
	if err := config.DB.Preload("Items").First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Order not found",
		})
		return
	}

	// Check if order is already paid
	if order.PaymentStatus == "paid" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Order is already paid",
		})
		return
	}

	// Extract payment details from payment_data
	paymentData, ok := req.PaymentData.(map[string]interface{})
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid payment data format",
		})
		return
	}

	// Extract payment information from frontend PayPal data structure
	// Frontend sends: { orderID, payerID, details, paymentSource }
	paypalOrderID, _ := paymentData["orderID"].(string)
	payerID, _ := paymentData["payerID"].(string)
	payerEmail := ""
	transactionID := ""

	// Try to get details object
	details, hasDetails := paymentData["details"].(map[string]interface{})

	// If no details, try legacy format
	if !hasDetails {
		details = paymentData
	}

	// Extract payer email from details
	if payer, ok := details["payer"].(map[string]interface{}); ok {
		if emailInfo, ok := payer["email_address"].(string); ok {
			payerEmail = emailInfo
		}
	}

	// Extract transaction ID from purchase_units
	if purchaseUnits, ok := details["purchase_units"].([]interface{}); ok && len(purchaseUnits) > 0 {
		if unit, ok := purchaseUnits[0].(map[string]interface{}); ok {
			if payments, ok := unit["payments"].(map[string]interface{}); ok {
				if captures, ok := payments["captures"].([]interface{}); ok && len(captures) > 0 {
					if capture, ok := captures[0].(map[string]interface{}); ok {
						if id, ok := capture["id"].(string); ok {
							transactionID = id
						}
					}
				}
			}
		}
	}

	// Fallback: use PayPal orderID or details ID as transaction ID
	if transactionID == "" {
		if id, ok := details["id"].(string); ok {
			transactionID = id
		} else if paypalOrderID != "" {
			transactionID = paypalOrderID
		}
	}

	// Create payment transaction record
	transaction := models.PaymentTransaction{
		OrderID:       order.ID,
		TransactionID: transactionID,
		PaymentMethod: req.PaymentMethod,
		Amount:        order.TotalAmount,
		Currency:      order.Currency,
		Status:        "completed",
		PayerID:       payerID,
		PayerEmail:    payerEmail,
		PaymentData:   fmt.Sprintf("%+v", req.PaymentData),
	}

	if err := config.DB.Create(&transaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create payment transaction",
		})
		return
	}

	// Update order status
	order.PaymentStatus = "paid"
	order.PaymentID = paypalOrderID // Use PayPal order ID
	order.PaymentMethod = req.PaymentMethod
	order.Status = "confirmed" // Change from pending to confirmed

	if err := config.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update order status",
		})
		return
	}

	// Update product stock
	for _, item := range order.Items {
		config.DB.Model(&models.Product{}).Where("id = ?", item.ProductID).
			UpdateColumn("stock_quantity", config.DB.Raw("stock_quantity - ?", item.Quantity))
	}

	// Load updated order with relationships
	config.DB.Preload("Items.Product").Preload("User").First(&order, order.ID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Payment processed successfully",
		"data":    order,
	})
}

// GetOrders gets all orders (admin only) with improved filtering
func (oc *OrderController) GetOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	paymentStatus := c.Query("payment_status")
	customerEmail := c.Query("customer_email")
	orderNumber := c.Query("order_number")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	offset := (page - 1) * pageSize

	query := config.DB.Model(&models.Order{})

	// Apply filters
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if paymentStatus != "" {
		query = query.Where("payment_status = ?", paymentStatus)
	}
	if customerEmail != "" {
		query = query.Where("customer_email LIKE ?", "%"+customerEmail+"%")
	}
	if orderNumber != "" {
		query = query.Where("order_number LIKE ?", "%"+orderNumber+"%")
	}
	if dateFrom != "" {
		query = query.Where("created_at >= ?", dateFrom)
	}
	if dateTo != "" {
		query = query.Where("created_at <= ?", dateTo)
	}

	var total int64
	query.Count(&total)

	var orders []models.Order
	if err := query.Preload("Items.Product").Preload("User").
		Offset(offset).Limit(pageSize).
		Order("created_at DESC").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch orders",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Orders retrieved successfully",
		"data": gin.H{
			"data":        orders,
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// GetOrder gets a single order
func (oc *OrderController) GetOrder(c *gin.Context) {
	orderID := c.Param("id")

	var order models.Order
	if err := config.DB.Preload("Items.Product").Preload("User").
		First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Order not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order retrieved successfully",
		"data":    order,
	})
}

// UpdateOrderStatus updates order status (admin only)
func (oc *OrderController) UpdateOrderStatus(c *gin.Context) {
	orderID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
		Notes  string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	// Validate status
	validStatuses := []string{"pending", "confirmed", "processing", "shipped", "delivered", "cancelled"}
	validStatus := false
	for _, status := range validStatuses {
		if req.Status == status {
			validStatus = true
			break
		}
	}

	if !validStatus {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid status. Valid statuses: pending, confirmed, processing, shipped, delivered, cancelled",
		})
		return
	}

	var order models.Order
	if err := config.DB.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Order not found",
		})
		return
	}

	order.Status = req.Status
	if req.Notes != "" {
		order.Notes = req.Notes
	}

	if err := config.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update order",
		})
		return
	}

	// Load updated order with relationships
	config.DB.Preload("Items.Product").Preload("User").First(&order, order.ID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order updated successfully",
		"data":    order,
	})
}

// GetOrderByNumber gets order by order number (public - for order tracking)
func (oc *OrderController) GetOrderByNumber(c *gin.Context) {
	orderNumber := c.Param("orderNumber")

	if orderNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Order number is required",
		})
		return
	}

	var order models.Order
	if err := config.DB.Where("order_number = ?", orderNumber).
		Preload("Items.Product").Preload("User").
		First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Order not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order retrieved successfully",
		"data":    order,
	})
}

// DeleteOrder deletes an order (admin only)
func (oc *OrderController) DeleteOrder(c *gin.Context) {
	orderID := c.Param("id")

	var order models.Order
	if err := config.DB.Preload("Items").First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Order not found",
		})
		return
	}

	// Check if order can be deleted (only pending or cancelled orders can be deleted)
	if order.Status != "pending" && order.Status != "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Only pending or cancelled orders can be deleted",
		})
		return
	}

	// If order was paid, restore product stock before deletion
	if order.PaymentStatus == "paid" {
		for _, item := range order.Items {
			config.DB.Model(&models.Product{}).Where("id = ?", item.ProductID).
				UpdateColumn("stock_quantity", config.DB.Raw("stock_quantity + ?", item.Quantity))
		}
	}

	// Delete order items first
	if err := config.DB.Where("order_id = ?", order.ID).Delete(&models.OrderItem{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to delete order items",
		})
		return
	}

	// Delete payment transactions
	config.DB.Where("order_id = ?", order.ID).Delete(&models.PaymentTransaction{})

	// Delete the order
	if err := config.DB.Delete(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to delete order",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order deleted successfully",
	})
}

// UpdateOrder updates an order (admin only)
func (oc *OrderController) UpdateOrder(c *gin.Context) {
	orderID := c.Param("id")

	var req struct {
		CustomerEmail   string `json:"customer_email"`
		CustomerName    string `json:"customer_name"`
		CustomerPhone   string `json:"customer_phone"`
		ShippingAddress string `json:"shipping_address"`
		BillingAddress  string `json:"billing_address"`
		TrackingNumber  string `json:"tracking_number"`
		ShippingCarrier string `json:"shipping_carrier"`
		NotifyShipped   bool   `json:"notify_shipped"`
		Status          string `json:"status"`
		PaymentStatus   string `json:"payment_status"`
		Notes           string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	var order models.Order
	if err := config.DB.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Order not found",
		})
		return
	}

	prevTracking := order.TrackingNumber
	prevCarrier := order.ShippingCarrier
	prevEmailSent := order.ShippedEmailSentAt

	// Update order fields if provided
	if req.CustomerEmail != "" {
		order.CustomerEmail = req.CustomerEmail
	}
	if req.CustomerName != "" {
		order.CustomerName = req.CustomerName
	}
	if req.CustomerPhone != "" {
		order.CustomerPhone = req.CustomerPhone
	}
	if req.ShippingAddress != "" {
		order.ShippingAddress = req.ShippingAddress
	}
	if req.BillingAddress != "" {
		order.BillingAddress = req.BillingAddress
	}
	if req.TrackingNumber != "" || c.Query("allow_clear") == "1" {
		// allow_clear=1 supports clearing the field from admin UI
		order.TrackingNumber = req.TrackingNumber
		if req.TrackingNumber != "" {
			now := time.Now()
			order.ShippedAt = &now
		} else {
			order.ShippedAt = nil
		}
	}
	if req.ShippingCarrier != "" || c.Query("allow_clear") == "1" {
		order.ShippingCarrier = req.ShippingCarrier
	}
	if req.Status != "" {
		// Validate status
		validStatuses := []string{"pending", "confirmed", "processing", "shipped", "delivered", "cancelled"}
		validStatus := false
		for _, status := range validStatuses {
			if req.Status == status {
				validStatus = true
				break
			}
		}
		if !validStatus {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid status. Valid statuses: pending, confirmed, processing, shipped, delivered, cancelled",
			})
			return
		}
		order.Status = req.Status
	}
	if req.PaymentStatus != "" {
		// Validate payment status
		validPaymentStatuses := []string{"pending", "paid", "failed", "refunded"}
		validPaymentStatus := false
		for _, status := range validPaymentStatuses {
			if req.PaymentStatus == status {
				validPaymentStatus = true
				break
			}
		}
		if !validPaymentStatus {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid payment status. Valid statuses: pending, paid, failed, refunded",
			})
			return
		}
		order.PaymentStatus = req.PaymentStatus
	}
	if req.Notes != "" {
		order.Notes = req.Notes
	}

	if err := config.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update order",
		})
		return
	}

	// Send shipping notification email (optional)
	if req.NotifyShipped {
		// reload setting and check
		setting, err := services.GetOrCreateEmailSetting(config.DB)
		if err == nil && setting.Enabled && setting.ShippingNotificationsEnabled {
			if order.CustomerEmail != "" && order.TrackingNumber != "" {
				shouldSend := false
				if prevEmailSent == nil {
					shouldSend = true
				} else if prevTracking != order.TrackingNumber || prevCarrier != order.ShippingCarrier {
					shouldSend = true
				}
				if shouldSend {
					siteURL := os.Getenv("SITE_URL")
					if siteURL == "" {
						// best effort from request headers
						proto := c.GetHeader("X-Forwarded-Proto")
						if proto == "" {
							proto = "https"
						}
						host := c.GetHeader("X-Forwarded-Host")
						if host == "" {
							host = c.Request.Host
						}
						if host != "" {
							siteURL = fmt.Sprintf("%s://%s", proto, host)
						}
					}

					subj, txt, html := services.BuildShipmentNotificationEmail(siteURL, order)
					err := services.SendEmail(config.DB, services.EmailSendOptions{To: order.CustomerEmail, Subject: subj, Text: txt, HTML: html, Headers: map[string]string{"X-Entity-Ref-ID": "shipment:" + order.OrderNumber}})
					if err == nil {
						now := time.Now()
						order.ShippedEmailSentAt = &now
						config.DB.Model(&models.Order{}).Where("id = ?", order.ID).Update("shipped_email_sent_at", &now)
					} else {
						// Keep order saved; just include a warning in response.
						c.Header("X-Email-Warn", err.Error())
					}
				}
			}
		}
	}

	// Load updated order with relationships
	config.DB.Preload("Items.Product").Preload("User").First(&order, order.ID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order updated successfully",
		"data":    order,
	})
}
