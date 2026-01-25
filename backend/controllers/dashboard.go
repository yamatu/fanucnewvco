package controllers

import (
	"net/http"
	"strconv"
	"time"

	"fanuc-backend/config"
	"fanuc-backend/models"

	"github.com/gin-gonic/gin"
)

type DashboardController struct{}

func NewDashboardController() *DashboardController {
	return &DashboardController{}
}

type DashboardStats struct {
	TotalProducts      int64   `json:"total_products"`
	ActiveProducts     int64   `json:"active_products"`
	FeaturedProducts   int64   `json:"featured_products"`
	TotalCategories    int64   `json:"total_categories"`
	TotalOrders        int64   `json:"total_orders"`
	PendingOrders      int64   `json:"pending_orders"`
	CompletedOrders    int64   `json:"completed_orders"`
	MonthlyOrders      int64   `json:"monthly_orders"`
	TotalRevenue       float64 `json:"total_revenue"`
	MonthlyRevenue     float64 `json:"monthly_revenue"`
	TotalUsers         int64   `json:"total_users"`
	ActiveUsers        int64   `json:"active_users"`
	TotalBanners       int64   `json:"total_banners"`
	TotalPurchaseLinks int64   `json:"total_purchase_links"`
}

type RecentOrder struct {
	ID            uint      `json:"id"`
	OrderNumber   string    `json:"order_number"`
	CustomerName  string    `json:"customer_name"`
	CustomerEmail string    `json:"customer_email"`
	TotalAmount   float64   `json:"total_amount"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

type TopProduct struct {
	ID        uint    `json:"id"`
	Name      string  `json:"name"`
	SKU       string  `json:"sku"`
	Price     float64 `json:"price"`
	TotalSold int64   `json:"total_sold"`
	Revenue   float64 `json:"revenue"`
}

type RevenueData struct {
	Month   string  `json:"month"`
	Revenue float64 `json:"revenue"`
	Orders  int64   `json:"orders"`
}

// GetDashboardStats godoc
// @Summary Get dashboard statistics
// @Description Get dashboard statistics for admin
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.APIResponse{data=DashboardStats}
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/admin/dashboard/stats [get]
func (c *DashboardController) GetDashboardStats(ctx *gin.Context) {
	db := config.GetDB()

	// Get total products count
	var totalProducts int64
	if err := db.Model(&models.Product{}).Count(&totalProducts).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get products count",
			Error:   err.Error(),
		})
		return
	}

	// Get active products count
	var activeProducts int64
	if err := db.Model(&models.Product{}).Where("is_active = ?", true).Count(&activeProducts).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get active products count",
			Error:   err.Error(),
		})
		return
	}

	// Get featured products count
	var featuredProducts int64
	if err := db.Model(&models.Product{}).Where("is_featured = ?", true).Count(&featuredProducts).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get featured products count",
			Error:   err.Error(),
		})
		return
	}

	// Get total categories count
	var totalCategories int64
	if err := db.Model(&models.Category{}).Count(&totalCategories).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get categories count",
			Error:   err.Error(),
		})
		return
	}

	// Get total paid orders count
	var totalOrders int64
	if err := db.Model(&models.Order{}).
		Where("payment_status = ?", "paid").
		Where("status <> ?", "cancelled").
		Count(&totalOrders).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get orders count",
			Error:   err.Error(),
		})
		return
	}

	// Get pending orders count
	var pendingOrders int64
	if err := db.Model(&models.Order{}).
		Where("payment_status <> ?", "paid").
		Where("status <> ?", "cancelled").
		Count(&pendingOrders).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get pending orders count",
			Error:   err.Error(),
		})
		return
	}

	// Get completed orders count (paid orders)
	var completedOrders int64
	if err := db.Model(&models.Order{}).
		Where("payment_status = ?", "paid").
		Where("status <> ?", "cancelled").
		Count(&completedOrders).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get completed orders count",
			Error:   err.Error(),
		})
		return
	}

	// Get monthly paid orders count (current month)
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	var monthlyOrders int64
	if err := db.Model(&models.Order{}).
		Where("payment_status = ?", "paid").
		Where("status <> ?", "cancelled").
		Where("created_at >= ? AND created_at <= ?", startOfMonth, now).
		Count(&monthlyOrders).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get monthly orders count",
			Error:   err.Error(),
		})
		return
	}

	// Get total revenue (paid orders)
	var totalRevenue float64
	if err := db.Model(&models.Order{}).
		Where("payment_status = ?", "paid").
		Where("status <> ?", "cancelled").
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&totalRevenue).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get total revenue",
			Error:   err.Error(),
		})
		return
	}

	// Get monthly revenue (paid orders)
	var monthlyRevenue float64
	if err := db.Model(&models.Order{}).
		Where("payment_status = ?", "paid").
		Where("status <> ?", "cancelled").
		Where("created_at >= ? AND created_at <= ?", startOfMonth, now).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&monthlyRevenue).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get monthly revenue",
			Error:   err.Error(),
		})
		return
	}

	// Get total users count (admin users)
	var totalUsers int64
	if err := db.Model(&models.AdminUser{}).Count(&totalUsers).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get users count",
			Error:   err.Error(),
		})
		return
	}

	// Get active users count (users who logged in within last 30 days)
	thirtyDaysAgo := now.AddDate(0, 0, -30)
	var activeUsers int64
	if err := db.Model(&models.AdminUser{}).Where("last_login >= ?", thirtyDaysAgo).Count(&activeUsers).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get active users count",
			Error:   err.Error(),
		})
		return
	}

	// Get total banners count
	var totalBanners int64
	if err := db.Model(&models.Banner{}).Count(&totalBanners).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get banners count",
			Error:   err.Error(),
		})
		return
	}

	// Get total purchase links count
	var totalPurchaseLinks int64
	if err := db.Model(&models.PurchaseLink{}).Count(&totalPurchaseLinks).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get purchase links count",
			Error:   err.Error(),
		})
		return
	}

	stats := DashboardStats{
		TotalProducts:      totalProducts,
		ActiveProducts:     activeProducts,
		FeaturedProducts:   featuredProducts,
		TotalCategories:    totalCategories,
		TotalOrders:        totalOrders,
		PendingOrders:      pendingOrders,
		CompletedOrders:    completedOrders,
		MonthlyOrders:      monthlyOrders,
		TotalRevenue:       totalRevenue,
		MonthlyRevenue:     monthlyRevenue,
		TotalUsers:         totalUsers,
		ActiveUsers:        activeUsers,
		TotalBanners:       totalBanners,
		TotalPurchaseLinks: totalPurchaseLinks,
	}

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Dashboard statistics retrieved successfully",
		Data:    stats,
	})
}

// GetRecentOrders godoc
// @Summary Get recent orders for dashboard
// @Description Get recent orders for admin dashboard
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Number of orders to return" default(5)
// @Param include_pending query int false "Include non-paid orders" default(0)
// @Success 200 {object} models.APIResponse{data=[]RecentOrder}
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/admin/dashboard/recent-orders [get]
func (c *DashboardController) GetRecentOrders(ctx *gin.Context) {
	db := config.GetDB()

	// Get limit from query parameter
	limit := 5
	if limitStr := ctx.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	query := db.Preload("Items").Preload("Items.Product").
		Order("created_at DESC").
		Limit(limit)

	// Default: show paid orders on the dashboard.
	// You can override this by passing ?include_pending=1.
	// Note: paid orders can be in confirmed/processing/shipped/delivered.
	includePending := ctx.Query("include_pending") == "1"
	if !includePending {
		query = query.Where("payment_status = ?", "paid").Where("status <> ?", "cancelled")
	}

	var orders []models.Order
	if err := query.Find(&orders).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get recent orders",
			Error:   err.Error(),
		})
		return
	}

	// Convert to RecentOrder format
	recentOrders := []RecentOrder{}
	for _, order := range orders {
		recentOrders = append(recentOrders, RecentOrder{
			ID:            order.ID,
			OrderNumber:   order.OrderNumber,
			CustomerName:  order.CustomerName,
			CustomerEmail: order.CustomerEmail,
			TotalAmount:   order.TotalAmount,
			Status:        order.Status,
			CreatedAt:     order.CreatedAt,
		})
	}

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Recent orders retrieved successfully",
		Data:    recentOrders,
	})
}

// GetTopProducts godoc
// @Summary Get top products for dashboard
// @Description Get top selling products for admin dashboard
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Number of products to return" default(5)
// @Param days query int false "Time range in days (0=all time)" default(30)
// @Success 200 {object} models.APIResponse{data=[]TopProduct}
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/admin/dashboard/top-products [get]
func (c *DashboardController) GetTopProducts(ctx *gin.Context) {
	db := config.GetDB()

	// Get limit from query parameter
	limit := 5
	if limitStr := ctx.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Compute top products from real sales data.
	// Default range: last 30 days. Use ?days=0 for all-time.
	days := 30
	if daysStr := ctx.Query("days"); daysStr != "" {
		if parsedDays, err := strconv.Atoi(daysStr); err == nil && parsedDays >= 0 {
			days = parsedDays
		}
	}
	var since time.Time
	if days > 0 {
		since = time.Now().AddDate(0, 0, -days)
	}

	// We aggregate order_items by product and join product info.
	topProducts := []TopProduct{}
	query := db.Table("order_items").
		Select(
			"products.id AS id, products.name AS name, products.sku AS sku, products.price AS price, "+
				"COALESCE(SUM(order_items.quantity), 0) AS total_sold, "+
				"COALESCE(SUM(order_items.total_price), 0) AS revenue",
		).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Joins("JOIN products ON products.id = order_items.product_id").
		Where("orders.payment_status = ?", "paid").
		Where("orders.status <> ?", "cancelled")
	if days > 0 {
		query = query.Where("orders.created_at >= ?", since)
	}
	if err := query.
		Select(
			"products.id AS id, products.name AS name, products.sku AS sku, products.price AS price, " +
				"COALESCE(SUM(order_items.quantity), 0) AS total_sold, " +
				"COALESCE(SUM(order_items.total_price), 0) AS revenue",
		).
		Group("products.id, products.name, products.sku, products.price").
		Order("total_sold DESC, revenue DESC").
		Limit(limit).
		Scan(&topProducts).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to get top products",
			Error:   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Top products retrieved successfully",
		Data:    topProducts,
	})
}

// GetRevenueData godoc
// @Summary Get revenue data for dashboard charts
// @Description Get revenue data for admin dashboard charts
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param period query string false "Period for revenue data" Enums(week,month,year) default(month)
// @Success 200 {object} models.APIResponse{data=[]RevenueData}
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/admin/dashboard/revenue [get]
func (c *DashboardController) GetRevenueData(ctx *gin.Context) {
	db := config.GetDB()
	period := ctx.DefaultQuery("period", "month")

	var revenueData []RevenueData
	now := time.Now()

	switch period {
	case "week":
		// Get last 7 days
		for i := 6; i >= 0; i-- {
			date := now.AddDate(0, 0, -i)
			startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
			endOfDay := startOfDay.Add(24 * time.Hour)

			var revenue float64
			var orders int64

			db.Model(&models.Order{}).
				Where("payment_status = ?", "paid").
				Where("status <> ?", "cancelled").
				Where("created_at >= ? AND created_at < ?", startOfDay, endOfDay).
				Select("COALESCE(SUM(total_amount), 0)").Scan(&revenue)

			db.Model(&models.Order{}).
				Where("payment_status = ?", "paid").
				Where("status <> ?", "cancelled").
				Where("created_at >= ? AND created_at < ?", startOfDay, endOfDay).
				Count(&orders)

			revenueData = append(revenueData, RevenueData{
				Month:   date.Format("Jan 02"),
				Revenue: revenue,
				Orders:  orders,
			})
		}
	case "year":
		// Get last 12 months
		for i := 11; i >= 0; i-- {
			date := now.AddDate(0, -i, 0)
			startOfMonth := time.Date(date.Year(), date.Month(), 1, 0, 0, 0, 0, date.Location())
			endOfMonth := startOfMonth.AddDate(0, 1, 0)

			var revenue float64
			var orders int64

			db.Model(&models.Order{}).
				Where("payment_status = ?", "paid").
				Where("status <> ?", "cancelled").
				Where("created_at >= ? AND created_at < ?", startOfMonth, endOfMonth).
				Select("COALESCE(SUM(total_amount), 0)").Scan(&revenue)

			db.Model(&models.Order{}).
				Where("payment_status = ?", "paid").
				Where("status <> ?", "cancelled").
				Where("created_at >= ? AND created_at < ?", startOfMonth, endOfMonth).
				Count(&orders)

			revenueData = append(revenueData, RevenueData{
				Month:   date.Format("Jan 2006"),
				Revenue: revenue,
				Orders:  orders,
			})
		}
	default: // month
		// Get last 30 days
		for i := 29; i >= 0; i-- {
			date := now.AddDate(0, 0, -i)
			startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
			endOfDay := startOfDay.Add(24 * time.Hour)

			var revenue float64
			var orders int64

			db.Model(&models.Order{}).
				Where("payment_status = ?", "paid").
				Where("status <> ?", "cancelled").
				Where("created_at >= ? AND created_at < ?", startOfDay, endOfDay).
				Select("COALESCE(SUM(total_amount), 0)").Scan(&revenue)

			db.Model(&models.Order{}).
				Where("payment_status = ?", "paid").
				Where("status <> ?", "cancelled").
				Where("created_at >= ? AND created_at < ?", startOfDay, endOfDay).
				Count(&orders)

			revenueData = append(revenueData, RevenueData{
				Month:   date.Format("Jan 02"),
				Revenue: revenue,
				Orders:  orders,
			})
		}
	}

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Revenue data retrieved successfully",
		Data:    revenueData,
	})
}
