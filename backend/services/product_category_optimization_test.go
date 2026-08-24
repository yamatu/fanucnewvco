package services

import (
	"sync"
	"testing"

	"fanuc-backend/models"
)

func TestCategorySlugForBrandTypeIsBrandScoped(t *testing.T) {
	got := categorySlugForBrandType("siemens", "variable-frequency-drives", "Variable Frequency Drive")
	if got != "siemens-variable-frequency-drives" {
		t.Fatalf("categorySlugForBrandType() = %q", got)
	}
}

func TestFindExactBrandCategoryDoesNotUseTypeLeafAsBrandParent(t *testing.T) {
	rootID := uint(7)
	categories := []models.Category{
		{ID: 3, Name: "Siemens Drives", Slug: "siemens-drives", IsActive: true},
		{ID: rootID, Name: "Siemens", Slug: "siemens", IsActive: false},
	}
	got, ok := findExactBrandCategory(categories, "siemens", "Siemens")
	if !ok || got.ID != rootID {
		t.Fatalf("findExactBrandCategory() = %#v, %v; want exact Siemens root", got, ok)
	}
}

func TestFindExactTypeChildPrefersActiveAndNeverCrossesBrandParent(t *testing.T) {
	siemensID := uint(10)
	abbID := uint(20)
	categories := []models.Category{
		{ID: 1, Name: "Variable Frequency Drive", Slug: "abb-variable-frequency-drives", ParentID: &abbID, IsActive: true},
		{ID: 2, Name: "Variable Frequency Drive", Slug: "siemens-variable-frequency-drives", ParentID: &siemensID, IsActive: false},
		{ID: 3, Name: "Variable Frequency Drive", Slug: "siemens-vfd", ParentID: &siemensID, IsActive: true},
	}
	got, ok := findExactTypeChild(categories, siemensID, "Variable Frequency Drive", "siemens-variable-frequency-drives")
	if !ok || got.ID != 3 {
		t.Fatalf("findExactTypeChild() = %#v, %v; want active Siemens child", got, ok)
	}
}

func TestFindExactTypeChildReusesInactiveExactNode(t *testing.T) {
	parentID := uint(10)
	categories := []models.Category{
		{ID: 4, Name: "Power Supply Unit", Slug: "siemens-power-supplies", ParentID: &parentID, IsActive: false},
	}
	got, ok := findExactTypeChild(categories, parentID, "Power Supply Unit", "siemens-power-supplies")
	if !ok || got.ID != 4 || got.IsActive {
		t.Fatalf("findExactTypeChild() = %#v, %v; want inactive exact node for reactivation", got, ok)
	}
}

func TestFindCompatibleTypeChildReusesInactivePluralizedLegacyNode(t *testing.T) {
	parentID := uint(10)
	categories := []models.Category{
		{ID: 5, Name: "Variable Frequency Drives", Slug: "siemens-vfds", ParentID: &parentID, IsActive: false},
	}
	inference := ProductCategoryInference{
		BrandKey:     "siemens",
		BrandName:    "Siemens",
		PartType:     "Variable Frequency Drive",
		CategorySlug: "variable-frequency-drives",
		MatchRule:    "siemens:model-vfd",
	}
	got, ok := findCompatibleTypeChild(categories, parentID, "Siemens", inference)
	if !ok || got.ID != 5 || got.IsActive {
		t.Fatalf("findCompatibleTypeChild() = %#v, %v; want inactive compatible node", got, ok)
	}
}

func TestFindCompatibleTypeChildReusesInactiveLineReactorsLegacyNode(t *testing.T) {
	parentID := uint(10)
	categories := []models.Category{
		{ID: 6, Name: "Line Reactors", Slug: "line-reactors", ParentID: &parentID, IsActive: false},
	}
	inference := ProductCategoryInference{
		BrandKey:     "siemens",
		BrandName:    "Siemens",
		PartType:     "Line Reactor / Input Choke",
		CategorySlug: "line-reactors-input-chokes",
		MatchRule:    "admin-name:type:line-reactor-input-choke",
	}
	got, ok := findCompatibleTypeChild(categories, parentID, "Siemens", inference)
	if !ok || got.ID != 6 || got.IsActive {
		t.Fatalf("findCompatibleTypeChild() = %#v, %v; want inactive Line Reactors node", got, ok)
	}
}

func TestInferAdminNameCategoryRequiresExactModelAndSupportedBrand(t *testing.T) {
	model := "6SE6999-9XX99-9XX9"
	got, ok := inferAdminNameCategory("", model, "Siemens 6SE6999-9XX99-9XX9 Line Reactor Input Choke")
	if !ok || got.BrandKey != "siemens" || got.PartType != "Line Reactor / Input Choke" || got.MatchRule != "admin-name:type:line-reactor-input-choke" {
		t.Fatalf("inferAdminNameCategory() = %#v, %v", got, ok)
	}
	if _, ok := inferAdminNameCategory("Siemens", model, "Siemens Line Reactor Input Choke"); ok {
		t.Fatal("name without the complete product identifier must not be trusted")
	}
	if _, ok := inferAdminNameCategory("Acme", "ACME-123", "Acme ACME-123 Line Reactor"); ok {
		t.Fatal("an unsupported free-form brand must not be confirmed from the name")
	}
}

func TestInferGenericReactorAndOutputFilterTypes(t *testing.T) {
	tests := []struct {
		name string
		want string
	}{
		{name: "6SE6400 Line Reactor Input Choke", want: "Line Reactor / Input Choke"},
		{name: "6SE6400 Output Reactor Output Choke", want: "Output Reactor / Output Choke"},
		{name: "6SE6400 Output LC Sine Wave Filter", want: "Output LC / Sine-wave Filter"},
	}
	for _, test := range tests {
		if got := inferGenericCategoryInference("siemens", test.name); got.PartType != test.want {
			t.Fatalf("inferGenericCategoryInference(%q) = %#v, want %q", test.name, got, test.want)
		}
	}
}

func TestMicromasterAccessoryDoesNotMatchBroadDriveFamilyNode(t *testing.T) {
	inference := InferProductCategory("Siemens", "6SE6400-3CC02-6BB3")
	if !IsConfirmedProductCategory(inference, "6SE6400-3CC02-6BB3") {
		t.Fatalf("expected confirmed Siemens accessory: %#v", inference)
	}
	if CategoryPathMatchesInference("Siemens > MICROMASTER 4 Variable Frequency Drives", inference) {
		t.Fatalf("line reactor must not match broad MICROMASTER drive node: %#v", inference)
	}
}

func TestCategoryCreationLockSerializesConcurrentDeduplication(t *testing.T) {
	const workers = 24
	created := 0
	exists := false
	var wait sync.WaitGroup
	for index := 0; index < workers; index++ {
		wait.Add(1)
		go func() {
			defer wait.Done()
			if err := withCategoryCreationLock(func() error {
				if !exists {
					exists = true
					created++
				}
				return nil
			}); err != nil {
				t.Errorf("withCategoryCreationLock() error = %v", err)
			}
		}()
	}
	wait.Wait()
	if created != 1 {
		t.Fatalf("concurrent creation count = %d, want 1", created)
	}
}

func TestProductClassificationModelFallbackOrder(t *testing.T) {
	product := models.Product{SKU: "SKU-1", PartNumber: "6SE6400-3CC02-6BB3"}
	if got := productClassificationModel(product); got != "6SE6400-3CC02-6BB3" {
		t.Fatalf("productClassificationModel() = %q", got)
	}
	product.PartNumber = ""
	product.Model = " 6SE6400 3CC04 4DD0 "
	if got := productClassificationModel(product); got != "6SE6400-3CC04-4DD0" {
		t.Fatalf("productClassificationModel() should choose the most specific manufacturer identifier, got %q", got)
	}
	product.Model = "MICROMASTER 4"
	product.PartNumber = "6SE6400-3CC08-3ED0"
	if got := productClassificationModel(product); got != "6SE6400-3CC08-3ED0" {
		t.Fatalf("productClassificationModel() = %q; broad Model must not outrank full PartNumber", got)
	}
}
