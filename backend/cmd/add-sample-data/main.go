package main

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// 尝试加载环境变量（优先匹配 GO_ENV）
	env := os.Getenv("GO_ENV")
	switch env {
	case "production":
		_ = godotenv.Load(".env.production")
	default:
		_ = godotenv.Load(".env")
	}

	// Initialize database connection
	config.ConnectDatabase()
	db := config.GetDB()

	if db == nil {
		log.Fatal("Failed to connect to database")
	}

	// Check if products already exist
	var count int64
	db.Model(&models.Product{}).Count(&count)
	if count > 0 {
		log.Println("Products already exist, skipping seed")
		return
	}

	// Get first category for products
	var category models.Category
	if err := db.First(&category).Error; err != nil {
		log.Fatal("No categories found. Please create categories first.")
	}

	// Helper function to create float64 pointer
	float64Ptr := func(f float64) *float64 { return &f }

	// Sample products data
	products := []models.Product{
		{
			Name:             "FANUC A02B-0120-C041 Servo Drive",
			SKU:              "A02B-0120-C041",
			Slug:             "fanuc-a02b-0120-c041-servo-drive",
			ShortDescription: "High-performance servo drive for industrial automation",
			Description:      "The FANUC A02B-0120-C041 is a state-of-the-art servo drive designed for precision control in industrial automation applications. Features advanced motion control algorithms and robust construction for reliable operation in demanding environments.",
			Price:            2850.00,
			ComparePrice:     float64Ptr(3200.00),
			CostPrice:        float64Ptr(2100.00),
			StockQuantity:    25,
			MinStockLevel:    5,
			Weight:           float64Ptr(2.5),
			Dimensions:       "200x150x100mm",
			Brand:            "FANUC",
			CategoryID:       category.ID,
			IsActive:         true,
			IsFeatured:       true,
			MetaTitle:        "FANUC A02B-0120-C041 Servo Drive - High Performance",
			MetaDescription:  "Buy FANUC A02B-0120-C041 servo drive for industrial automation. High-performance, reliable, and precision control.",
			MetaKeywords:     "FANUC, servo drive, A02B-0120-C041, industrial automation, motion control",
		},
		{
			Name:             "FANUC A860-0360-T001 Encoder",
			SKU:              "A860-0360-T001",
			Slug:             "fanuc-a860-0360-t001-encoder",
			ShortDescription: "Precision absolute encoder for servo motors",
			Description:      "The FANUC A860-0360-T001 is a high-resolution absolute encoder designed for use with FANUC servo motors. Provides accurate position feedback with excellent repeatability and long-term stability.",
			Price:            1950.00,
			ComparePrice:     float64Ptr(2200.00),
			CostPrice:        float64Ptr(1400.00),
			StockQuantity:    18,
			MinStockLevel:    3,
			Weight:           float64Ptr(0.8),
			Dimensions:       "80x80x50mm",
			Brand:            "FANUC",
			CategoryID:       category.ID,
			IsActive:         true,
			IsFeatured:       false,
			MetaTitle:        "FANUC A860-0360-T001 Absolute Encoder",
			MetaDescription:  "High-precision FANUC A860-0360-T001 absolute encoder for servo motor position feedback.",
			MetaKeywords:     "FANUC, encoder, A860-0360-T001, absolute encoder, servo motor, position feedback",
		},
		{
			Name:             "FANUC 10S-3000 Spindle Motor",
			SKU:              "10S-3000",
			Slug:             "fanuc-10s-3000-spindle-motor",
			ShortDescription: "High-speed spindle motor for machining centers",
			Description:      "The FANUC 10S-3000 is a high-speed spindle motor designed for machining centers and CNC machines. Delivers exceptional performance with speeds up to 15,000 RPM and superior surface finish quality.",
			Price:            4200.00,
			ComparePrice:     float64Ptr(4800.00),
			CostPrice:        float64Ptr(3200.00),
			StockQuantity:    8,
			MinStockLevel:    2,
			Weight:           float64Ptr(15.5),
			Dimensions:       "300x200x200mm",
			Brand:            "FANUC",
			CategoryID:       category.ID,
			IsActive:         true,
			IsFeatured:       true,
			MetaTitle:        "FANUC 10S-3000 High-Speed Spindle Motor",
			MetaDescription:  "FANUC 10S-3000 spindle motor for CNC machining centers. High-speed performance up to 15,000 RPM.",
			MetaKeywords:     "FANUC, spindle motor, 10S-3000, CNC, machining center, high-speed",
		},
	}

	// Create products
	for i, product := range products {
		if err := db.Create(&product).Error; err != nil {
			log.Printf("Error creating product %d: %v", i+1, err)
			continue
		}

		// Add sample images for each product
		imageURLs := [][]string{
			// Product 1 - Servo Drive
			{
				"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&h=500&fit=crop&crop=center",
				"https://images.unsplash.com/photo-1581092795442-6d4b3b8e5b8e?w=500&h=500&fit=crop&crop=center",
			},
			// Product 2 - Encoder
			{
				"https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=500&h=500&fit=crop&crop=center",
				"https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=500&fit=crop&crop=center",
			},
			// Product 3 - Spindle Motor
			{
				"https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=500&h=500&fit=crop&crop=center",
				"https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&h=500&fit=crop&crop=center",
			},
		}

		for j, url := range imageURLs[i] {
			image := models.ProductImage{
				ProductID:    product.ID,
				URL:          url,
				Filename:     "product-image.jpg",
				OriginalName: "Product Image",
				IsPrimary:    j == 0, // First image is primary
			}

			if err := db.Create(&image).Error; err != nil {
				log.Printf("Error creating image for product %d: %v", product.ID, err)
			}
		}

		// Add sample attributes
		attributeData := [][]map[string]string{
			// Product 1 attributes
			{
				{"name": "Voltage", "value": "220V AC"},
				{"name": "Frequency", "value": "50/60 Hz"},
				{"name": "Protection", "value": "IP65"},
				{"name": "Operating Temperature", "value": "-10°C to +50°C"},
			},
			// Product 2 attributes
			{
				{"name": "Resolution", "value": "17-bit"},
				{"name": "Interface", "value": "Serial"},
				{"name": "Protection", "value": "IP67"},
				{"name": "Operating Temperature", "value": "-20°C to +70°C"},
			},
			// Product 3 attributes
			{
				{"name": "Max Speed", "value": "15,000 RPM"},
				{"name": "Power", "value": "3.7 kW"},
				{"name": "Cooling", "value": "Air Cooled"},
				{"name": "Mounting", "value": "Flange Mount"},
			},
		}

		for _, attr := range attributeData[i] {
			attribute := models.ProductAttribute{
				ProductID:      product.ID,
				AttributeName:  attr["name"],
				AttributeValue: attr["value"],
			}

			if err := db.Create(&attribute).Error; err != nil {
				log.Printf("Error creating attribute for product %d: %v", product.ID, err)
			}
		}

		// Add sample purchase links
		purchaseLinks := []models.PurchaseLink{
			{
				ProductID: product.ID,
				Platform:  "Official Store",
				URL:       "https://www.fanuc.com/products",
				Price:     float64Ptr(product.Price),
				IsActive:  true,
			},
			{
				ProductID: product.ID,
				Platform:  "Authorized Dealer",
				URL:       "https://dealer.fanuc.com/products",
				Price:     float64Ptr(product.Price * 1.05), // Slightly higher price
				IsActive:  true,
			},
		}

		for _, link := range purchaseLinks {
			if err := db.Create(&link).Error; err != nil {
				log.Printf("Error creating purchase link for product %d: %v", product.ID, err)
			}
		}

		log.Printf("Created product: %s", product.Name)
	}

	log.Println("Sample product data added successfully!")
}
