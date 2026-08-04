package controllers

import (
	"fanuc-backend/models"
	"testing"
)

func TestParseAIPriceImportAcceptedFormats(t *testing.T) {
	rows, identifiers := parseAIPriceImport("A06B-1234 120$\nA20B-5678 = 99.50 USD\nA02B-0001:45")
	if len(rows) != 3 || len(identifiers) != 3 {
		t.Fatalf("expected 3 rows and identifiers, got %d rows and %d identifiers", len(rows), len(identifiers))
	}
	if rows[0].Model != "A06B-1234" || rows[0].Price != 120 || rows[0].Currency != "USD" {
		t.Fatalf("unexpected first row: %#v", rows[0])
	}
	if rows[1].Price != 99.50 || rows[2].Price != 45 {
		t.Fatalf("unexpected parsed prices: %#v", rows)
	}
}

func TestParseAIPriceImportCSVUsesNamedColumns(t *testing.T) {
	rows, identifiers := parseAIPriceImport("description,model,sold_price\nlegacy case,A06B-1234,\"$1,280.00\"")
	if len(rows) != 1 || len(identifiers) != 1 {
		t.Fatalf("expected one CSV row, got %#v", rows)
	}
	if rows[0].Model != "A06B-1234" || rows[0].Price != 1280 || rows[0].Currency != "USD" {
		t.Fatalf("unexpected CSV row: %#v", rows[0])
	}
}

func TestBuildAIPricePreviewOnlyProposesUniqueExactMatches(t *testing.T) {
	rows, _ := parseAIPriceImport("a06b-1234 120\nUNKNOWN 50\nDUPLICATE 25")
	products := []models.Product{
		{ID: 1, SKU: "SKU-1", Model: "A06B-1234", Price: 100},
		{ID: 2, SKU: "DUPLICATE", Price: 10},
		{ID: 3, PartNumber: "DUPLICATE", Price: 12},
	}
	preview := buildAIPricePreview(rows, products)
	if preview.Matched != 1 || preview.Unmatched != 1 || preview.Ambiguous != 1 {
		t.Fatalf("unexpected preview counts: %#v", preview)
	}
	if len(preview.Suggestions) != 1 || numberField(preview.Suggestions[0].Data["product_id"]) != 1 {
		t.Fatalf("expected one proposal for product 1: %#v", preview.Suggestions)
	}
}

func TestBuildAIPricePreviewRejectsConflictingDuplicatePrices(t *testing.T) {
	rows, _ := parseAIPriceImport("A06B-1234 120\nA06B-1234 121")
	preview := buildAIPricePreview(rows, []models.Product{{ID: 1, Model: "A06B-1234", Price: 100}})
	if preview.Conflicts != 2 || len(preview.Suggestions) != 0 {
		t.Fatalf("conflicting prices must not produce suggestions: %#v", preview)
	}
}

func TestDecorateAIProductCreationSuggestionsUsesServerDefaults(t *testing.T) {
	reply := aiAgentReply{Suggestions: []aiAction{{
		Type: "create_product",
		Data: map[string]any{
			"model": "A06B-1234", "price": 9999, "sale_price": 8888,
			"warranty_period": "invented", "lead_time": "invented", "is_active": true,
		},
	}}}
	setting := &models.AIAgentSetting{
		DefaultProductPrice: 125.50, DefaultWarrantyPeriod: "12 months", DefaultLeadTime: "3-7 days",
	}
	if !decorateAIProductCreationSuggestions(&reply, setting) {
		t.Fatal("configured defaults should allow the product proposal")
	}
	data := reply.Suggestions[0].Data
	if data["default_price"] != 125.50 || data["warranty_period"] != "12 months" || data["lead_time"] != "3-7 days" {
		t.Fatalf("server defaults were not applied: %#v", data)
	}
	if _, exists := data["price"]; exists {
		t.Fatalf("AI-supplied price must be removed: %#v", data)
	}
	if active, _ := data["is_active"].(bool); active {
		t.Fatalf("new AI products must remain inactive: %#v", data)
	}
}

func TestDecorateAIProductCreationSuggestionsRequiresConfiguredPrice(t *testing.T) {
	reply := aiAgentReply{Suggestions: []aiAction{{Type: "create_product", Data: map[string]any{"model": "A06B-1234"}}}}
	if decorateAIProductCreationSuggestions(&reply, &models.AIAgentSetting{DefaultProductPrice: 0}) {
		t.Fatal("zero default price must block product creation proposals")
	}
}

func TestBuildAIProductDraftUsesBusinessDefaultsAndStaysInactive(t *testing.T) {
	setting := &models.AIAgentSetting{
		DefaultProductPrice: 321.25, DefaultWarrantyPeriod: "6 months", DefaultLeadTime: "5-9 days",
	}
	product, err := buildAIProductDraft(map[string]any{
		"model": "a06b-1234", "brand": "fanuc", "product_type": "Servo Amplifier / Drive",
		"price": 9999, "warranty_period": "invented", "lead_time": "invented", "is_active": true,
	}, setting, 42)
	if err != nil {
		t.Fatalf("unexpected draft error: %v", err)
	}
	if product.Price != 321.25 || product.WarrantyPeriod != "6 months" || product.LeadTime != "5-9 days" {
		t.Fatalf("draft did not use server defaults: %#v", product)
	}
	if product.IsActive || product.CategoryID != 42 || product.SKU != "A06B-1234" || product.Brand != "FANUC" {
		t.Fatalf("unexpected product draft identity/state: %#v", product)
	}
	if product.MetaTitle == "" || product.MetaDescription == "" || product.Description == "" {
		t.Fatalf("SEO fallback fields must be populated: %#v", product)
	}
}
