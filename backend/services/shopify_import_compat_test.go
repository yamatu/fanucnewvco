package services

import (
	"encoding/json"
	"testing"

	"fanuc-backend/models"
)

func TestNormalizeShopifyProductsJSONPayload(t *testing.T) {
	raw := map[string]any{
		"source_type":       "shopify_collection",
		"source_site":       "b-automationservice",
		"collection_handle": "fanuc",
		"collection_name":   "Fanuc",
		"shopify_product": map[string]any{
			"id":           float64(15949967720793),
			"title":        "A860-0392-T013 FANUC",
			"handle":       "fanuc-a860-0392-t013",
			"body_html":    "A detailed description",
			"vendor":       "FANUC",
			"product_type": "Sensors",
			"tags":         []any{"SKU-A860-0392-T013", "CAT-Sensors"},
			"variants": []any{
				map[string]any{
					"id":                 float64(56702091624793),
					"sku":                "A860-0392-T013",
					"price":              "17316.00",
					"available":          true,
					"inventory_quantity": float64(4),
					"option1":            "NEW SEALED",
				},
			},
			"images": []any{
				map[string]any{"src": "https://cdn.example.test/fanuc.jpg", "alt": "Fanuc sensor"},
			},
			"options": []any{
				map[string]any{"name": "Condition", "values": []any{"NEW SEALED"}},
			},
		},
	}

	normalized := NormalizeEbayImportDraftPayload(raw)
	assertShopifyString(t, normalized, "source_type", "shopify_collection")
	assertShopifyString(t, normalized, "source_site", "b-automationservice")
	assertShopifyString(t, normalized, "product_id", "15949967720793")
	assertShopifyString(t, normalized, "product_title", "A860-0392-T013 FANUC")
	assertShopifyString(t, normalized, "description_full", "A detailed description")
	assertShopifyString(t, normalized, "brand", "FANUC")
	assertShopifyString(t, normalized, "sku", "A860-0392-T013")
	assertShopifyString(t, normalized, "part_number", "A860-0392-T013")
	assertShopifyString(t, normalized, "condition", "NEW SEALED")

	if got := normalized["product_url"]; got != "https://www.b-automationservice.com/products/fanuc-a860-0392-t013" {
		t.Fatalf("product_url = %v", got)
	}
	if got := normalized["currency"]; got != "EUR" {
		t.Fatalf("currency = %v, want EUR", got)
	}
	images, ok := normalized["image_urls"].([]string)
	if !ok || len(images) != 1 || images[0] != "https://cdn.example.test/fanuc.jpg" {
		t.Fatalf("image_urls = %#v", normalized["image_urls"])
	}
	if _, ok := normalized["variants"].([]any); !ok {
		t.Fatalf("variants were not preserved: %T", normalized["variants"])
	}
}

func TestNormalizeDirectShopifyProductPayload(t *testing.T) {
	raw := map[string]any{
		"id":       float64(12345678901234),
		"title":    "Omron Relay",
		"handle":   "omron-relay",
		"vendor":   "Omron",
		"variants": []any{map[string]any{"sku": "G2R-1", "price": "12.50"}},
	}
	normalized := NormalizeEbayImportDraftPayload(raw)
	assertShopifyString(t, normalized, "source_type", "shopify_collection")
	assertShopifyString(t, normalized, "product_id", "12345678901234")
	assertShopifyString(t, normalized, "sku", "G2R-1")
	assertShopifyString(t, normalized, "current_price", "12.50")
}

func TestBuildProductRequestFromShopifyDraftKeepsCommerceFields(t *testing.T) {
	raw := map[string]any{
		"source_type":      "shopify_collection",
		"product_title":    "FANUC Sensor",
		"description_full": "Detailed sensor description",
		"current_price":    "99.50",
		"compare_price":    "120.00",
		"stock_quantity":   float64(7),
		"sku":              "A860-TEST",
		"vendor":           "FANUC",
		"product_type":     "Sensors",
		"tags":             []any{"SKU-A860-TEST", "CAT-Sensors"},
		"image_urls":       []any{"https://cdn.example.test/sensor.jpg"},
	}
	normalized := NormalizeEbayImportDraftPayload(raw)
	draft := models.EbayImportDraft{}
	_ = normalized
	draft.RawPayload = mustJSONForShopifyTest(normalized)
	draft.NormalizedTitle = "FANUC Sensor"
	draft.DescriptionRaw = "Detailed sensor description"
	draft.NormalizedPartNumber = "A860-TEST"
	draft.NormalizedBrand = "FANUC"
	draft.NormalizedPrice = 99.50
	draft.ImageSourceURLs = `["https://cdn.example.test/sensor.jpg"]`

	request := BuildProductRequestFromDraft(nil, draft)
	if request.SKU != "A860-TEST" || request.StockQuantity != 7 || request.Price != 99.50 {
		t.Fatalf("request commerce fields = %#v", request)
	}
	if request.ComparePrice == nil || *request.ComparePrice != 120.00 {
		t.Fatalf("compare price = %#v", request.ComparePrice)
	}
	if request.Description == "" || len(request.Attributes) < 3 || len(request.Images) != 1 {
		t.Fatalf("request content was not preserved: %#v", request)
	}
}

func TestBuildEbayImportDraftFromShopifySkipsRemoteMediaMirror(t *testing.T) {
	raw := map[string]any{
		"platform":     "shopify",
		"source_type":  "shopify_collection",
		"id":           float64(15949967720793),
		"title":        "FANUC Sensor",
		"handle":       "fanuc-sensor",
		"body_html":    "Description",
		"vendor":       "FANUC",
		"product_type": "Sensors",
		"variants":     []any{map[string]any{"sku": "A860-TEST", "price": "99.50"}},
		"images":       []any{map[string]any{"src": "https://cdn.example.test/sensor.jpg"}},
		"options":      []any{},
	}
	result := BuildEbayImportDraft(nil, raw)
	if result.Draft.TitleRaw != "FANUC Sensor" || result.Draft.NormalizedBrand != "FANUC" {
		t.Fatalf("draft identity = %#v", result.Draft)
	}
	if result.Draft.NormalizedPrice != 99.50 || result.Draft.NormalizedPartNumber != "A860-TEST" {
		t.Fatalf("draft commerce fields = %#v", result.Draft)
	}
	if got := decodeUintSlice(result.Draft.MediaAssetIDs); len(got) != 0 {
		t.Fatalf("Shopify draft unexpectedly mirrored media assets: %#v", got)
	}
	if images := decodeStringSlice(result.Draft.ImageSourceURLs); len(images) != 1 || images[0] != "https://cdn.example.test/sensor.jpg" {
		t.Fatalf("source image URLs = %#v", images)
	}
}

func mustJSONForShopifyTest(value map[string]any) string {
	encoded, err := json.Marshal(value)
	if err != nil {
		panic(err)
	}
	return string(encoded)
}

func assertShopifyString(t *testing.T, payload map[string]any, key string, want string) {
	t.Helper()
	got, _ := payload[key].(string)
	if got != want {
		t.Fatalf("%s = %q, want %q", key, got, want)
	}
}
