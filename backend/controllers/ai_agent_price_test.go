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
