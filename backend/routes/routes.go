package routes

import (
	"fanuc-backend/config"
	"fanuc-backend/controllers"
	"fanuc-backend/handlers"
	"fanuc-backend/middleware"
	"fanuc-backend/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Initialize services
	db := config.GetDB()
	companyProfileService := services.NewCompanyProfileService(db)

	// Initialize controllers
	authController := &controllers.AuthController{}
	productController := &controllers.ProductController{}
	categoryController := &controllers.CategoryController{}
	orderController := &controllers.OrderController{}
	userController := &controllers.UserController{}
	bannerController := &controllers.BannerController{}
	purchaseLinkController := &controllers.PurchaseLinkController{}
	homepageContentController := &controllers.HomepageContentController{}
	companyProfileController := controllers.NewCompanyProfileController(companyProfileService)
	dashboardController := controllers.NewDashboardController()
	contactHandler := handlers.NewContactHandler(db)
	sitemapController := &controllers.SitemapController{}
	couponController := &controllers.CouponController{}
	customerController := &controllers.CustomerController{}
	ticketController := &controllers.TicketController{}

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "FANUC Backend API is running",
		})
	})

	// SEO: dynamic sitemap index and sections (compatible with competitor)
	r.GET("/xmlsitemap.php", sitemapController.GetXMLSitemap)

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Public routes (no authentication required)
		public := v1.Group("/public")
		{
			// Categories (public read access)
			public.GET("/categories", categoryController.GetCategories)
			public.GET("/categories/:id", categoryController.GetCategory)
			public.GET("/categories/slug/:slug", categoryController.GetCategoryBySlug)

			// Products (public read access)
			public.GET("/products", productController.GetProducts)
			public.GET("/products/:id", productController.GetProduct)
			public.GET("/products/sku", productController.GetProductBySKUQuery) // query param: sku=...
			public.GET("/products/sku/:sku", productController.GetProductBySKU)  // legacy: path param

			// Banners (public read access)
			public.GET("/banners", bannerController.GetPublicBanners)

			// Homepage Content (public read access)
			public.GET("/homepage-content", homepageContentController.GetHomepageContents)
			public.GET("/homepage-content/section/:section_key", homepageContentController.GetHomepageContentBySection)

			// Company Profile (public read access)
			public.GET("/company-profile", companyProfileController.GetCompanyProfile)

			// Contact form submission (public access)
			public.POST("/contact", contactHandler.SubmitContact)

			// Coupon validation (public access)
			public.POST("/coupons/validate", couponController.ValidateCoupon)
		}

		// Authentication routes
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authController.Login)

			// Protected auth routes
			authProtected := auth.Group("")
			authProtected.Use(middleware.AuthMiddleware())
			{
				authProtected.GET("/profile", authController.GetProfile)
				authProtected.PUT("/profile", authController.UpdateProfile)
				authProtected.POST("/change-password", authController.ChangePassword)
			}
		}

		// Admin routes (authentication required)
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthMiddleware())
		{
			// Dashboard statistics (admin and editor access)
			dashboard := admin.Group("/dashboard")
			dashboard.Use(middleware.EditorOrAdmin())
			{
				dashboard.GET("/stats", dashboardController.GetDashboardStats)
				dashboard.GET("/recent-orders", dashboardController.GetRecentOrders)
				dashboard.GET("/top-products", dashboardController.GetTopProducts)
				dashboard.GET("/revenue", dashboardController.GetRevenueData)
			}

			// Category management (admin and editor access)
			categories := admin.Group("/categories")
			categories.Use(middleware.EditorOrAdmin())
			{
				categories.GET("", categoryController.GetCategories)
				categories.GET("/:id", categoryController.GetCategory)
				categories.POST("", categoryController.CreateCategory)
				categories.PUT("/:id", categoryController.UpdateCategory)
				categories.DELETE("/:id", middleware.AdminOnly(), categoryController.DeleteCategory)
			}

			// Product management (admin and editor access)
			products := admin.Group("/products")
			products.Use(middleware.EditorOrAdmin())
			{
				products.GET("", productController.GetProducts)
				products.GET("/:id", productController.GetProduct)
				products.POST("", productController.CreateProduct)
				products.PUT("/:id", productController.UpdateProduct)
				products.DELETE("/:id", middleware.AdminOnly(), productController.DeleteProduct)

				// SEO auto-import from external site (e.g., fanucworld.com)
				products.POST("/:id/auto-seo", productController.AutoImportSEO)

				// Bulk update is_active / is_featured
				products.PUT("/bulk-update", productController.BulkUpdateProducts)

                // Product image management
                products.POST("/:id/images", productController.AddImage)
                products.GET("/:id/images", productController.GetProductImages)
                // Note: controller expects :imageIndex for deletion
                products.DELETE("/:id/images/:imageIndex", middleware.AdminOnly(), productController.DeleteImage)
			}

			// SEO import utilities (admin and editor access)
			seo := admin.Group("/seo")
			seo.Use(middleware.EditorOrAdmin())
			{
				seo.POST("/lookup", productController.LookupSEO)
                // Bulk import endpoint (IDs or SKUs)
                seo.POST("/bulk-import", productController.BulkAutoImportSEO)
			}

			// Order management (admin only)
			orders := admin.Group("/orders")
			orders.Use(middleware.AdminOnly())
			{
				orders.GET("", orderController.GetOrders)
				orders.GET("/:id", orderController.GetOrder)
				orders.PUT("/:id", orderController.UpdateOrder)
				orders.PUT("/:id/status", orderController.UpdateOrderStatus)
				orders.DELETE("/:id", orderController.DeleteOrder)
			}

			// User management (admin only)
			users := admin.Group("/users")
			users.Use(middleware.AdminOnly())
			{
				users.GET("", userController.GetUsers)
				users.GET("/:id", userController.GetUser)
				users.POST("", userController.CreateUser)
				users.PUT("/:id", userController.UpdateUser)
				users.DELETE("/:id", userController.DeleteUser)
			}

			// Banner management (admin and editor access)
			banners := admin.Group("/banners")
			banners.Use(middleware.EditorOrAdmin())
			{
				banners.GET("", bannerController.GetBanners)
				banners.GET("/:id", bannerController.GetBanner)
				banners.POST("", bannerController.CreateBanner)
				banners.PUT("/:id", bannerController.UpdateBanner)
				banners.PUT("/:id/order", bannerController.UpdateBannerOrder)
				banners.DELETE("/:id", middleware.AdminOnly(), bannerController.DeleteBanner)
			}

			// Purchase Link management (admin and editor access)
			purchaseLinks := admin.Group("/purchase-links")
			purchaseLinks.Use(middleware.EditorOrAdmin())
			{
				purchaseLinks.GET("", purchaseLinkController.GetPurchaseLinks)
				purchaseLinks.GET("/:id", purchaseLinkController.GetPurchaseLink)
				purchaseLinks.POST("", purchaseLinkController.CreatePurchaseLink)
				purchaseLinks.PUT("/:id", purchaseLinkController.UpdatePurchaseLink)
				purchaseLinks.DELETE("/:id", middleware.AdminOnly(), purchaseLinkController.DeletePurchaseLink)
			}

			// Homepage Content management (admin and editor access)
			homepageContent := admin.Group("/homepage-content")
			homepageContent.Use(middleware.EditorOrAdmin())
			{
				homepageContent.GET("", homepageContentController.GetHomepageContents)
				homepageContent.GET("/sections", homepageContentController.GetPredefinedSections)
				homepageContent.GET("/:id", homepageContentController.GetHomepageContent)
				homepageContent.POST("", homepageContentController.CreateHomepageContent)
				homepageContent.PUT("/:id", homepageContentController.UpdateHomepageContent)
				homepageContent.DELETE("/:id", middleware.AdminOnly(), homepageContentController.DeleteHomepageContent)
			}

			// Company Profile management (admin and editor access)
			companyProfile := admin.Group("/company-profile")
			companyProfile.Use(middleware.EditorOrAdmin())
			{
				companyProfile.GET("", companyProfileController.GetCompanyProfileAdmin)
				companyProfile.POST("", companyProfileController.UpsertCompanyProfile)
				companyProfile.PUT("/:id", companyProfileController.UpdateCompanyProfile)
				companyProfile.DELETE("/:id", middleware.AdminOnly(), companyProfileController.DeleteCompanyProfile)
			}

			// Contact Messages management (admin and editor access)
			contacts := admin.Group("/contacts")
			contacts.Use(middleware.EditorOrAdmin())
			{
				contacts.GET("", contactHandler.GetContacts)
				contacts.GET("/stats", contactHandler.GetContactStats)
				contacts.GET("/:id", contactHandler.GetContact)
				contacts.PUT("/:id", contactHandler.UpdateContactStatus)
				contacts.DELETE("/:id", middleware.AdminOnly(), contactHandler.DeleteContact)
			}

			// Coupon management (admin and editor access)
			coupons := admin.Group("/coupons")
			coupons.Use(middleware.EditorOrAdmin())
			{
				coupons.GET("", couponController.GetCoupons)
				coupons.GET("/:id", couponController.GetCoupon)
				coupons.GET("/:id/usage", couponController.GetCouponUsage)
				coupons.POST("", couponController.CreateCoupon)
				coupons.PUT("/:id", couponController.UpdateCoupon)
				coupons.DELETE("/:id", middleware.AdminOnly(), couponController.DeleteCoupon)
			}

			// Customer management (admin and editor access)
			customers := admin.Group("/customers")
			customers.Use(middleware.EditorOrAdmin())
			{
				customers.GET("", customerController.GetAllCustomers)
				customers.GET("/:id", customerController.GetCustomerByID)
				customers.PUT("/:id/status", customerController.UpdateCustomerStatus)
				customers.DELETE("/:id", middleware.AdminOnly(), customerController.DeleteCustomer)
			}
		}

		// Public order endpoints (with optional customer authentication)
		publicOrders := v1.Group("/orders")
		publicOrders.Use(middleware.OptionalCustomerAuth()) // Try to authenticate if token present
		{
			publicOrders.POST("", orderController.CreateOrder)
			publicOrders.POST("/:id/payment", orderController.ProcessPayment)
			publicOrders.GET("/track/:orderNumber", orderController.GetOrderByNumber) // Order tracking endpoint
		}

		// Customer authentication routes (public)
		customer := v1.Group("/customer")
		{
			customer.POST("/register", customerController.Register)
			customer.POST("/login", customerController.Login)

			// Protected customer routes
			customerProtected := customer.Group("")
			customerProtected.Use(middleware.CustomerAuthMiddleware())
			{
				// Profile management
				customerProtected.GET("/profile", customerController.GetProfile)
				customerProtected.PUT("/profile", customerController.UpdateProfile)
				customerProtected.POST("/change-password", customerController.ChangePassword)

				// Customer orders
				customerProtected.GET("/orders", orderController.GetMyOrders)
				customerProtected.GET("/orders/:id", orderController.GetMyOrderDetails)

				// Ticket/Support system
				customerProtected.POST("/tickets", ticketController.CreateTicket)
				customerProtected.GET("/tickets", ticketController.GetMyTickets)
				customerProtected.GET("/tickets/:id", ticketController.GetTicketDetails)
				customerProtected.POST("/tickets/:id/reply", ticketController.ReplyToTicket)
			}
		}

		// Admin ticket management
		adminTickets := admin.Group("/tickets")
		adminTickets.Use(middleware.EditorOrAdmin())
		{
			adminTickets.GET("", ticketController.GetAllTickets)
			adminTickets.GET("/:id", ticketController.GetAdminTicketDetails)
			adminTickets.PUT("/:id", ticketController.UpdateTicketStatus)
			adminTickets.POST("/:id/reply", ticketController.AdminReplyToTicket)
		}
	}

	// Serve static files (uploaded images)
	r.Static("/uploads", "./uploads")
}
