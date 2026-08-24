package services

import (
	"testing"

	"fanuc-backend/models"
)

func TestDetectImportHeaderFindsCategoryColumn(t *testing.T) {
	header := []string{"型号(Model)", "价格(Price)", "数量(Quantity)", "重量kg(WeightKg)", "分类类型"}
	got := detectImportHeader(header)

	if got.Model != 0 || got.Price != 1 || got.Qty != 2 || got.Weight != 3 || got.Category != 4 {
		t.Fatalf("unexpected header map: %+v", got)
	}
}

func TestParseImportRowReadsCategory(t *testing.T) {
	row, ok, err := parseImportRow(
		[]string{"A06B-0123-B077", "1200", "3", "1.4", "Industrial Automation > Servo Motors"},
		importHeaderMap{Model: 0, Price: 1, Qty: 2, Weight: 3, Category: 4},
		2,
	)
	if err != nil {
		t.Fatalf("parseImportRow returned error: %v", err)
	}
	if !ok {
		t.Fatal("expected row to be parsed")
	}
	if row.Category != "Industrial Automation > Servo Motors" {
		t.Fatalf("unexpected category: %q", row.Category)
	}
}

func TestImportCategorySegments(t *testing.T) {
	got := importCategorySegments("Industrial Automation > Servo Motors")
	want := []string{"Industrial Automation", "Servo Motors"}
	if len(got) != len(want) {
		t.Fatalf("segments length mismatch: got %#v want %#v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("segment %d mismatch: got %q want %q", i, got[i], want[i])
		}
	}

	ioCategory := importCategorySegments("I/O Modules")
	if len(ioCategory) != 1 || ioCategory[0] != "I/O Modules" {
		t.Fatalf("I/O category should not be split: %#v", ioCategory)
	}
}

func TestImportCategoryBaseSlugFallbackForChinese(t *testing.T) {
	got := importCategoryBaseSlug("伺服电机")
	if got == "" || got == "伺服电机" {
		t.Fatalf("expected safe fallback slug, got %q", got)
	}
	if len(got) < len("category-00000000") {
		t.Fatalf("fallback slug too short: %q", got)
	}
}

func TestImportCategoryCatalogNeverCreatesMissingCategories(t *testing.T) {
	catalog := &importCategoryCatalog{
		BySlug:       map[string]uint{},
		ActiveBySlug: map[string]uint{},
		bySlugParent: map[string]uint{},
		byNameParent: map[string]uint{},
		byNameAny:    map[string][]uint{},
	}
	catalog.add(models.Category{ID: 1, Name: "FANUC", Slug: "fanuc", IsActive: true})
	if _, err := catalog.ResolveExisting("FANUC > Servo Motors"); err == nil {
		t.Fatal("missing category path should not be created during import")
	}
	if catalog.created != 0 {
		t.Fatalf("import created %d categories", catalog.created)
	}
}

func TestImportCategoryCatalogResolvesFullVerifiedPath(t *testing.T) {
	parentID := uint(1)
	catalog := &importCategoryCatalog{
		BySlug:       map[string]uint{},
		ActiveBySlug: map[string]uint{},
		bySlugParent: map[string]uint{},
		byNameParent: map[string]uint{},
		byNameAny:    map[string][]uint{},
		categories: []models.Category{
			{ID: 1, Name: "Fanuc", Slug: "fanuc", IsActive: true},
			{ID: 2, Name: "FANUC Servo Motor", Slug: "fanuc-servo-motor", ParentID: &parentID, IsActive: true},
		},
	}
	for _, category := range catalog.categories {
		catalog.add(category)
	}
	inference := InferProductCategory("FANUC", "A06B-0123-B077")
	if got := catalog.ResolveInference(inference, "Fanuc > FANUC Servo Motor"); got != 2 {
		t.Fatalf("full category path resolved to %d, want 2", got)
	}
}
