package services

import "testing"

func TestNormalizeEbayImportDraftPayloadFromGYCharmRecord(t *testing.T) {
	raw := map[string]any{
		"id":           float64(7),
		"_product_key": "legacy-key",
		"_is_request":  float64(2),
		"_product_data": map[string]any{
			"_product_url":                "https://www.ebay.co.uk/itm/FANUC-Servo/123456789012",
			"_shangjia_goodsName":         "FANUC A06B-6114-H106 Servo Amplifier",
			"_shangjia_minOnSalePriceStr": "GBP 899.00",
			"_shangjia_desc":              "<p>Tested industrial spare part</p>",
			"_shangjia_gallery":           []any{"https://i.ebayimg.com/images/g/main.jpg", "https://i.ebayimg.com/images/g/second.jpg"},
			"_shangjia_goodsProperty": []any{
				map[string]any{"name": "Brand", "value": "FANUC"},
				map[string]any{"name": "MPN", "value": "A06B-6114-H106"},
				map[string]any{"name": "Model", "value": "SVM1-80I"},
			},
			"_shangjia_condition": "Used",
		},
		"_addition_data": map[string]any{
			"_name":  "Fallback title",
			"_price": float64(899),
		},
	}

	normalized := NormalizeEbayImportDraftPayload(raw)
	assertNormalizedString(t, normalized, "source_type", "gycharm_ebay_extension")
	assertNormalizedString(t, normalized, "source_site", "ebay")
	assertNormalizedString(t, normalized, "product_id", "123456789012")
	assertNormalizedString(t, normalized, "product_title", "FANUC A06B-6114-H106 Servo Amplifier")
	assertNormalizedString(t, normalized, "brand", "FANUC")
	assertNormalizedString(t, normalized, "model", "SVM1-80I")
	assertNormalizedString(t, normalized, "mpn", "A06B-6114-H106")
	assertNormalizedString(t, normalized, "currency", "GBP")
	assertNormalizedString(t, normalized, "condition", "Used")

	images, ok := normalized["image_urls"].([]string)
	if !ok {
		t.Fatalf("image_urls type = %T, want []string", normalized["image_urls"])
	}
	if len(images) != 2 || images[0] != "https://i.ebayimg.com/images/g/main.jpg" {
		t.Fatalf("image_urls = %#v", images)
	}
	if normalized["_product_key"] != "legacy-key" {
		t.Fatalf("original plugin fields were not preserved")
	}
}

func TestCollectLegacyAttributePairs(t *testing.T) {
	pairs := collectLegacyAttributePairs([]any{
		map[string]any{"name": "Voltage", "value": "200 V"},
		map[string]any{"Controller Platform": "FANUC"},
	}, 0)
	if len(pairs) != 2 {
		t.Fatalf("pairs = %#v, want 2 attributes", pairs)
	}
	if pairs[0] != [2]string{"Voltage", "200 V"} {
		t.Fatalf("first pair = %#v", pairs[0])
	}
}

func assertNormalizedString(t *testing.T, payload map[string]any, key string, want string) {
	t.Helper()
	got, _ := payload[key].(string)
	if got != want {
		t.Fatalf("%s = %q, want %q", key, got, want)
	}
}
