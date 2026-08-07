package config

import (
	"encoding/json"
	"fanuc-backend/models"
	"testing"

	"gorm.io/datatypes"
)

func TestUpgradeLegacyCompanyCopy(t *testing.T) {
	legacy := "Vibocnc- One-Stop CNC Solution Supplier | Your Trusted Partner Since 2005 | 5,000sqm Workshop Facility"
	want := "Industrial Automation Parts, CNC Spares & Repair Support | FANUC, Siemens, Mitsubishi, ABB and 20+ automation brands | 3,500 sqm Parts Inspection & Service Facility"

	if got := upgradeLegacyCompanyCopy(legacy); got != want {
		t.Fatalf("upgradeLegacyCompanyCopy() = %q, want %q", got, want)
	}
}

func TestUpgradeLegacyJSONValueNormalizesCompanyStats(t *testing.T) {
	legacy := map[string]any{
		"stats": []any{
			map[string]any{"value": float64(20), "suffix": "+", "label": "Years Experience", "description": "Established in 2005"},
			map[string]any{"value": float64(5000), "suffix": "sqm", "label": "Workshop Facility", "description": "Modern facility"},
			map[string]any{"value": float64(10), "suffix": "+", "label": "Automation Brands", "description": "Major brands"},
			map[string]any{"value": "5,000", "title": "Square Meters", "subtitle": "Modern facility space"},
		},
	}

	updatedValue, changed := upgradeLegacyJSONValue(legacy)
	if !changed {
		t.Fatal("upgradeLegacyJSONValue() did not report a change")
	}

	updated := updatedValue.(map[string]any)["stats"].([]any)
	wants := []struct {
		value  float64
		suffix string
	}{
		{value: 15, suffix: "+"},
		{value: 3500, suffix: " sqm"},
		{value: 20, suffix: "+"},
	}

	for index, want := range wants {
		stat := updated[index].(map[string]any)
		if stat["value"] != want.value || stat["suffix"] != want.suffix {
			t.Fatalf("stat %d = value %v suffix %q, want value %v suffix %q", index, stat["value"], stat["suffix"], want.value, want.suffix)
		}
	}

	workshopStat := updated[3].(map[string]any)
	if workshopStat["value"] != "3,500" {
		t.Fatalf("workshop stat value = %v, want 3,500", workshopStat["value"])
	}
}

func TestUpgradeHomepageSEOContentAddsBrandToHero(t *testing.T) {
	content := models.HomepageContent{
		SectionKey: "hero_section",
		Title:      legacyHomepageHeroTitle,
		Data: datatypes.JSON(`{
			"slides": [{"title": "Industrial Automation Parts, CNC Spares & Repair Support"}]
		}`),
	}

	if !upgradeHomepageSEOContent(&content) {
		t.Fatal("upgradeHomepageSEOContent() did not report a hero change")
	}
	if content.Title != brandedHomepageHeroTitle {
		t.Fatalf("hero title = %q, want %q", content.Title, brandedHomepageHeroTitle)
	}

	var decoded map[string]any
	if err := json.Unmarshal(content.Data, &decoded); err != nil {
		t.Fatalf("decode upgraded hero data: %v", err)
	}
	firstSlide := decoded["slides"].([]any)[0].(map[string]any)
	if firstSlide["title"] != brandedHomepageHeroTitle {
		t.Fatalf("first slide title = %q, want %q", firstSlide["title"], brandedHomepageHeroTitle)
	}
	if upgradeHomepageSEOContent(&content) {
		t.Fatal("upgradeHomepageSEOContent() should be idempotent")
	}
}

func TestUpgradeHomepageSEOContentRestoresOnlyBlankBrandsPlaceholder(t *testing.T) {
	content := models.HomepageContent{SectionKey: "brands_section", IsActive: false}

	if !upgradeHomepageSEOContent(&content) {
		t.Fatal("upgradeHomepageSEOContent() did not restore the blank brands section")
	}
	if !content.IsActive || content.Title != "Brands We Supply" || content.ButtonURL != "/products" {
		t.Fatalf("restored brands section = %+v", content)
	}

	// Once the placeholder has real content, a later admin toggle must be kept.
	content.IsActive = false
	if upgradeHomepageSEOContent(&content) {
		t.Fatal("upgradeHomepageSEOContent() overrode an intentional brands toggle")
	}
	if content.IsActive {
		t.Fatal("configured brands section was unexpectedly re-enabled")
	}
}
