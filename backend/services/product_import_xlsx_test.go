package services

import (
	"testing"

	"fanuc-backend/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newProductImportTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}
	if err := db.AutoMigrate(&models.Category{}); err != nil {
		t.Fatalf("migrate categories: %v", err)
	}
	return db
}

func TestImportHeaderDetectsCategoryColumn(t *testing.T) {
	header := detectImportHeader([]string{"SKU", "Price", "Qty", "Weight", "Category Type"})
	if header.Model != 0 || header.Price != 1 || header.Qty != 2 || header.Weight != 3 || header.Category != 4 {
		t.Fatalf("unexpected header map: %+v", header)
	}
}

func TestImportCategoryResolverCreatesMissingCustomCategory(t *testing.T) {
	db := newProductImportTestDB(t)
	if err := db.Create(&models.Category{Name: "Control Units", Slug: "control-units", IsActive: true}).Error; err != nil {
		t.Fatalf("seed default category: %v", err)
	}

	resolver := loadImportCategoryResolver(db, "fanuc")
	var categoryID uint
	var created int
	err := db.Transaction(func(tx *gorm.DB) error {
		var err error
		categoryID, _, created, err = resolver.resolve(tx, "Custom Servo Packs", "control-units")
		return err
	})
	if err != nil {
		t.Fatalf("resolve category: %v", err)
	}
	if categoryID == 0 {
		t.Fatal("expected created category id")
	}
	if created != 1 {
		t.Fatalf("created categories = %d, want 1", created)
	}

	var category models.Category
	if err := db.First(&category, categoryID).Error; err != nil {
		t.Fatalf("load created category: %v", err)
	}
	if category.Name != "Custom Servo Packs" {
		t.Fatalf("category name = %q, want %q", category.Name, "Custom Servo Packs")
	}
	if category.Slug != "custom-servo-packs" {
		t.Fatalf("category slug = %q, want %q", category.Slug, "custom-servo-packs")
	}

	matchedID, _, createdAgain, err := resolver.resolve(db, "Custom Servo Packs", "control-units")
	if err != nil {
		t.Fatalf("resolve existing category: %v", err)
	}
	if matchedID != categoryID {
		t.Fatalf("matched id = %d, want %d", matchedID, categoryID)
	}
	if createdAgain != 0 {
		t.Fatalf("created on second resolve = %d, want 0", createdAgain)
	}
}
