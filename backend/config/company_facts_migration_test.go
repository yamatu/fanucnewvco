package config

import (
	"encoding/json"
	"fanuc-backend/models"
	"testing"

	"gorm.io/datatypes"
)

func TestUpgradeLegacyCompanyCopy(t *testing.T) {
	legacy := "Vcocnc- One-Stop CNC Solution Supplier | Your Trusted Partner Since 2005 | 5,000sqm Workshop Facility"
	want := "Industrial Automation Parts, CNC Spares & Repair Support | FANUC, Siemens, Mitsubishi, ABB and 20+ automation brands | 3,500 sqm Parts Inspection & Service Facility"

	if got := upgradeLegacyCompanyCopy(legacy); got != want {
		t.Fatalf("upgradeLegacyCompanyCopy() = %q, want %q", got, want)
	}
}

func TestUpgradeLegacyCompanyCopyRemovesUnsupportedClaims(t *testing.T) {
	legacy := "ISO Certified | 24/7 Operations | 24/7 Support Available | 24/7 availability | Yearly Turnover: 200M | Quality certification process | Certified technicians | Certified specialists | Join thousands of satisfied customers worldwide. | Continuous production | Quality Guaranteed | Quality guarantee | 100,000 items | 50-100 parcels | Controller Model 200M | ISO 9001-compatible part"
	want := "Documented Inspection | Responsive Service | Responsive Support | Responsive support | Worldwide Delivery Support | Documented inspection process | Experienced technicians | Automation parts specialists | Contact our team to discuss your automation parts requirements. | Parts inspection and service support | Quality Checked | Quality checks | 100,000 items | 50-100 parcels | Controller Model 200M | ISO 9001-compatible part"

	got := upgradeLegacyCompanyCopy(legacy)
	if got != want {
		t.Fatalf("upgradeLegacyCompanyCopy() = %q, want %q", got, want)
	}
	if second := upgradeLegacyCompanyCopy(got); second != got {
		t.Fatalf("upgradeLegacyCompanyCopy() is not idempotent: second pass = %q", second)
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

func TestUpgradeLegacyJSONValueRemovesOnlyUnsupportedStats(t *testing.T) {
	legacy := map[string]any{
		"stats": []any{
			map[string]any{"value": "200M", "label": "Yearly Turnover", "description": "Annual revenue"},
			map[string]any{"value": "24/7", "title": "Operations", "subtitle": "Continuous production"},
			map[string]any{"value": "ISO", "title": "Certified", "subtitle": "Quality standards"},
			map[string]any{"value": "200M", "label": "Controller Model", "description": "Admin-authored unrelated content"},
			map[string]any{"value": "100,000", "label": "Items Stocked", "description": "Regular inventory"},
			map[string]any{"value": "50-100", "label": "Daily Parcels", "description": "Shipments per day"},
		},
		"capabilities": []any{
			map[string]any{
				"title":       "ISO Certified",
				"description": "International quality management standards",
				"features":    []any{"Quality certification process", "Certified technicians", "Quality Guaranteed"},
			},
		},
	}

	updatedValue, changed := upgradeLegacyJSONValue(legacy)
	if !changed {
		t.Fatal("upgradeLegacyJSONValue() did not report a change")
	}
	updated := updatedValue.(map[string]any)
	stats := updated["stats"].([]any)
	if len(stats) != 3 {
		t.Fatalf("stats length = %d, want 3: %#v", len(stats), stats)
	}
	for index, wantValue := range []string{"200M", "100,000", "50-100"} {
		stat := stats[index].(map[string]any)
		if stat["value"] != wantValue {
			t.Fatalf("preserved stat %d value = %v, want %s", index, stat["value"], wantValue)
		}
	}

	capability := updated["capabilities"].([]any)[0].(map[string]any)
	if capability["title"] != "Documented Inspection" ||
		capability["description"] != "Documented inspection and quality-control procedures" {
		t.Fatalf("capability was not normalized: %#v", capability)
	}
	features := capability["features"].([]any)
	wantFeatures := []string{"Documented inspection process", "Experienced technicians", "Quality Checked"}
	for index, want := range wantFeatures {
		if features[index] != want {
			t.Fatalf("feature %d = %v, want %q", index, features[index], want)
		}
	}
	if _, changedAgain := upgradeLegacyJSONValue(updated); changedAgain {
		t.Fatal("upgradeLegacyJSONValue() should be idempotent")
	}
}

func TestUpgradeLegacyCompanyProfileRemovesUnsupportedClaims(t *testing.T) {
	profile := models.CompanyProfile{
		CompanySubtitle:   "ISO Certified",
		EstablishmentYear: "2005",
		WorkshopSize:      "5,000sqm",
		Description1:      "Join thousands of satisfied customers worldwide.",
		Achievement:       "Quality Guaranteed",
		Stats: models.CompanyStatsArray{
			{Value: "200M", Label: "Yearly Turnover", Description: "Annual revenue"},
			{Value: "24/7", Label: "Operations", Description: "Continuous production"},
			{Value: "ISO", Label: "Certified", Description: "Quality standards"},
			{Value: "2005", Label: "Established", Description: "Legacy date"},
			{Value: "50-100", Label: "Daily Parcels", Description: "Shipments per day"},
			{Value: "200M", Label: "Controller Model", Description: "Admin-authored unrelated content"},
		},
		Expertise: models.StringArray{"Certified specialists", "Servo drive sourcing"},
		WorkshopFacilities: models.WorkshopFacilitiesArray{
			{ID: "1", Title: "ISO Certified", Description: "Quality certification process"},
		},
	}

	if !upgradeLegacyCompanyProfile(&profile) {
		t.Fatal("upgradeLegacyCompanyProfile() did not report a change")
	}
	if profile.CompanySubtitle != "Documented Inspection" || profile.Achievement != "Quality Checked" {
		t.Fatalf("profile text was not normalized: %+v", profile)
	}
	if profile.EstablishmentYear != "2007" || profile.WorkshopSize != "3,500sqm" {
		t.Fatalf("legitimate company facts were not normalized: %+v", profile)
	}
	if len(profile.Stats) != 3 {
		t.Fatalf("stats length = %d, want 3: %#v", len(profile.Stats), profile.Stats)
	}
	if profile.Stats[0].Value != "2007" || profile.Stats[0].Label != "Established" {
		t.Fatalf("established stat = %+v", profile.Stats[0])
	}
	if profile.Stats[1].Value != "50-100" || profile.Stats[2].Label != "Controller Model" {
		t.Fatalf("legitimate stats were not preserved: %#v", profile.Stats)
	}
	if profile.Expertise[0] != "Automation parts specialists" || profile.Expertise[1] != "Servo drive sourcing" {
		t.Fatalf("expertise = %#v", profile.Expertise)
	}
	if profile.WorkshopFacilities[0].Title != "Documented Inspection" ||
		profile.WorkshopFacilities[0].Description != "Documented inspection process" {
		t.Fatalf("workshop facility = %+v", profile.WorkshopFacilities[0])
	}
	if upgradeLegacyCompanyProfile(&profile) {
		t.Fatal("upgradeLegacyCompanyProfile() should be idempotent")
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
