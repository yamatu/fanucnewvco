package controllers

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CouponController struct{}

// GetCoupons returns paginated list of coupons
func (cc *CouponController) GetCoupons(c *gin.Context) {
	db := config.GetDB()

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	search := c.Query("search")
	status := c.Query("status") // active, inactive, expired

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	query := db.Model(&models.Coupon{})

	// Apply search filter
	if search != "" {
		query = query.Where("code LIKE ? OR name LIKE ? OR description LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Apply status filter
	now := time.Now()
	switch status {
	case "active":
		query = query.Where("is_active = ? AND (starts_at IS NULL OR starts_at <= ?) AND (expires_at IS NULL OR expires_at >= ?)",
			true, now, now)
	case "inactive":
		query = query.Where("is_active = ?", false)
	case "expired":
		query = query.Where("expires_at IS NOT NULL AND expires_at < ?", now)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get coupons with pagination
	var coupons []models.Coupon
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&coupons).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to fetch coupons",
		})
		return
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: models.PaginationResponse{
			Data:       coupons,
			Page:       page,
			PageSize:   pageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// GetCoupon returns a single coupon by ID
func (cc *CouponController) GetCoupon(c *gin.Context) {
	db := config.GetDB()
	id := c.Param("id")

	var coupon models.Coupon
	err := db.First(&coupon, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Error:   "Coupon not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to fetch coupon",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    coupon,
	})
}

// CreateCoupon creates a new coupon
func (cc *CouponController) CreateCoupon(c *gin.Context) {
	db := config.GetDB()

	var req models.CouponCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	// Validate coupon code uniqueness
	var existingCoupon models.Coupon
	if err := db.Where("code = ?", strings.ToUpper(req.Code)).First(&existingCoupon).Error; err == nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Coupon code already exists",
		})
		return
	}

	// Validate percentage values
	if req.Type == "percentage" && req.Value > 100 {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Percentage value cannot exceed 100",
		})
		return
	}

	// Create coupon
	coupon := models.Coupon{
		Code:              strings.ToUpper(req.Code),
		Name:              req.Name,
		Description:       req.Description,
		Type:              req.Type,
		Value:             req.Value,
		MinOrderAmount:    req.MinOrderAmount,
		MaxDiscountAmount: req.MaxDiscountAmount,
		UsageLimit:        req.UsageLimit,
		UserUsageLimit:    req.UserUsageLimit,
		IsActive:          req.IsActive,
		StartsAt:          req.StartsAt,
		ExpiresAt:         req.ExpiresAt,
	}

	if err := db.Create(&coupon).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to create coupon",
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Coupon created successfully",
		Data:    coupon,
	})
}

// UpdateCoupon updates an existing coupon
func (cc *CouponController) UpdateCoupon(c *gin.Context) {
	db := config.GetDB()
	id := c.Param("id")

	var coupon models.Coupon
	if err := db.First(&coupon, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Error:   "Coupon not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to fetch coupon",
		})
		return
	}

	var req models.CouponCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	// Check if code is being changed and if new code already exists
	if strings.ToUpper(req.Code) != coupon.Code {
		var existingCoupon models.Coupon
		if err := db.Where("code = ? AND id != ?", strings.ToUpper(req.Code), coupon.ID).First(&existingCoupon).Error; err == nil {
			c.JSON(http.StatusBadRequest, models.APIResponse{
				Success: false,
				Error:   "Coupon code already exists",
			})
			return
		}
	}

	// Validate percentage values
	if req.Type == "percentage" && req.Value > 100 {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Percentage value cannot exceed 100",
		})
		return
	}

	// Update coupon
	coupon.Code = strings.ToUpper(req.Code)
	coupon.Name = req.Name
	coupon.Description = req.Description
	coupon.Type = req.Type
	coupon.Value = req.Value
	coupon.MinOrderAmount = req.MinOrderAmount
	coupon.MaxDiscountAmount = req.MaxDiscountAmount
	coupon.UsageLimit = req.UsageLimit
	coupon.UserUsageLimit = req.UserUsageLimit
	coupon.IsActive = req.IsActive
	coupon.StartsAt = req.StartsAt
	coupon.ExpiresAt = req.ExpiresAt

	if err := db.Save(&coupon).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to update coupon",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Coupon updated successfully",
		Data:    coupon,
	})
}

// DeleteCoupon deletes a coupon
func (cc *CouponController) DeleteCoupon(c *gin.Context) {
	db := config.GetDB()
	id := c.Param("id")

	var coupon models.Coupon
	if err := db.First(&coupon, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Error:   "Coupon not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to fetch coupon",
		})
		return
	}

    // If the coupon has usage records or is referenced by orders,
    // clean up dependent data before deleting the coupon.
    // 1) Delete coupon usage records
    if err := db.Where("coupon_id = ?", coupon.ID).Delete(&models.CouponUsage{}).Error; err != nil {
        c.JSON(http.StatusInternalServerError, models.APIResponse{
            Success: false,
            Error:   "Failed to delete coupon usage records",
        })
        return
    }

    // 2) Nullify coupon references on orders to preserve history
    if err := db.Model(&models.Order{}).Where("coupon_id = ?", coupon.ID).Update("coupon_id", nil).Error; err != nil {
        c.JSON(http.StatusInternalServerError, models.APIResponse{
            Success: false,
            Error:   "Failed to update related orders",
        })
        return
    }

    // 3) Delete the coupon itself
    if err := db.Delete(&coupon).Error; err != nil {
        c.JSON(http.StatusInternalServerError, models.APIResponse{
            Success: false,
            Error:   "Failed to delete coupon",
        })
        return
    }

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Coupon deleted successfully",
	})
}

// ValidateCoupon validates a coupon code and returns discount information
func (cc *CouponController) ValidateCoupon(c *gin.Context) {
	db := config.GetDB()

	var req models.CouponValidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	// Find coupon by code
	var coupon models.Coupon
	err := db.Where("code = ?", strings.ToUpper(req.Code)).First(&coupon).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusOK, models.APIResponse{
				Success: true,
				Data: models.CouponValidateResponse{
					Valid:   false,
					Message: "Invalid coupon code",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to validate coupon",
		})
		return
	}

	// Validate coupon
	response := cc.validateCouponRules(db, &coupon, req.OrderAmount, req.CustomerEmail)

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    response,
	})
}

// validateCouponRules validates all coupon rules and calculates discount
func (cc *CouponController) validateCouponRules(db *gorm.DB, coupon *models.Coupon, orderAmount float64, customerEmail string) models.CouponValidateResponse {
	now := time.Now()

	// Check if coupon is active
	if !coupon.IsActive {
		return models.CouponValidateResponse{
			Valid:   false,
			Message: "This coupon is not active",
		}
	}

	// Check start date
	if coupon.StartsAt != nil && now.Before(*coupon.StartsAt) {
		return models.CouponValidateResponse{
			Valid:   false,
			Message: "This coupon is not yet valid",
		}
	}

	// Check expiry date
	if coupon.ExpiresAt != nil && now.After(*coupon.ExpiresAt) {
		return models.CouponValidateResponse{
			Valid:   false,
			Message: "This coupon has expired",
		}
	}

	// Check minimum order amount
	if orderAmount < coupon.MinOrderAmount {
		return models.CouponValidateResponse{
			Valid:   false,
			Message: "Order amount does not meet minimum requirement",
		}
	}

	// Check total usage limit
	if coupon.UsageLimit != nil && coupon.UsedCount >= *coupon.UsageLimit {
		return models.CouponValidateResponse{
			Valid:   false,
			Message: "This coupon has reached its usage limit",
		}
	}

	// Check per-user usage limit
	if coupon.UserUsageLimit != nil {
		var userUsageCount int64
		db.Model(&models.CouponUsage{}).Where("coupon_id = ? AND customer_email = ?", coupon.ID, customerEmail).Count(&userUsageCount)
		if int(userUsageCount) >= *coupon.UserUsageLimit {
			return models.CouponValidateResponse{
				Valid:   false,
				Message: "You have reached the usage limit for this coupon",
			}
		}
	}

	// Calculate discount
	var discountAmount float64
	if coupon.Type == "percentage" {
		discountAmount = orderAmount * (coupon.Value / 100)
		// Apply maximum discount limit if set
		if coupon.MaxDiscountAmount != nil && discountAmount > *coupon.MaxDiscountAmount {
			discountAmount = *coupon.MaxDiscountAmount
		}
	} else {
		discountAmount = coupon.Value
		// Ensure discount doesn't exceed order amount
		if discountAmount > orderAmount {
			discountAmount = orderAmount
		}
	}

	finalAmount := orderAmount - discountAmount
	if finalAmount < 0 {
		finalAmount = 0
	}

	return models.CouponValidateResponse{
		Valid:          true,
		CouponID:       coupon.ID,
		Code:           coupon.Code,
		Name:           coupon.Name,
		Type:           coupon.Type,
		Value:          coupon.Value,
		DiscountAmount: discountAmount,
		FinalAmount:    finalAmount,
		Message:        "Coupon is valid",
	}
}

// ApplyCoupon applies a coupon to an order (used during order creation)
func (cc *CouponController) ApplyCoupon(db *gorm.DB, couponCode string, orderID uint, orderAmount float64, customerEmail string) (*models.CouponValidateResponse, error) {
	if couponCode == "" {
		return nil, nil // No coupon applied
	}

	// Find coupon
	var coupon models.Coupon
	err := db.Where("code = ?", strings.ToUpper(couponCode)).First(&coupon).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return &models.CouponValidateResponse{
				Valid:   false,
				Message: "Invalid coupon code",
			}, nil
		}
		return nil, err
	}

	// Validate coupon
	response := cc.validateCouponRules(db, &coupon, orderAmount, customerEmail)
	if !response.Valid {
		return &response, nil
	}

	// Create usage record
	usage := models.CouponUsage{
		CouponID:       coupon.ID,
		OrderID:        orderID,
		CustomerEmail:  customerEmail,
		DiscountAmount: response.DiscountAmount,
	}

	if err := db.Create(&usage).Error; err != nil {
		return nil, err
	}

	// Update coupon used count
	if err := db.Model(&coupon).UpdateColumn("used_count", gorm.Expr("used_count + ?", 1)).Error; err != nil {
		return nil, err
	}

	return &response, nil
}

// GetCouponUsage returns usage statistics for a coupon
func (cc *CouponController) GetCouponUsage(c *gin.Context) {
	db := config.GetDB()
	id := c.Param("id")

	var coupon models.Coupon
	if err := db.First(&coupon, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Error:   "Coupon not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Failed to fetch coupon",
		})
		return
	}

	// Get usage records
	var usages []models.CouponUsage
	db.Where("coupon_id = ?", coupon.ID).Order("created_at DESC").Find(&usages)

	// Calculate statistics
	var totalDiscount float64
	for _, usage := range usages {
		totalDiscount += usage.DiscountAmount
	}

	stats := map[string]interface{}{
		"coupon":         coupon,
		"usage_records":  usages,
		"total_uses":     len(usages),
		"total_discount": totalDiscount,
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    stats,
	})
}
