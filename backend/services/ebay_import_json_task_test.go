package services

import (
	"encoding/json"
	"strings"
	"sync"
	"testing"
)

func TestDecodeEbayDraftJSONArrayStreamsItems(t *testing.T) {
	decoder := json.NewDecoder(strings.NewReader(`[{"id":1,"title":"A"},{"id":2,"title":"B"}]`))
	token, err := decoder.Token()
	if err != nil || token != json.Delim('[') {
		t.Fatalf("expected array token, got %v, err=%v", token, err)
	}
	ids := make([]string, 0, 2)
	err = decodeEbayDraftJSONArray(decoder, func(item map[string]any) error {
		ids = append(ids, firstLegacyString(item["id"]))
		return nil
	})
	if err != nil {
		t.Fatalf("decodeEbayDraftJSONArray returned error: %v", err)
	}
	if len(ids) != 2 || ids[0] != "1" || ids[1] != "2" {
		t.Fatalf("unexpected ids: %#v", ids)
	}
}

func TestEbayDraftImportKeysNormalizeDuplicates(t *testing.T) {
	listingKey, sourceURL := ebayDraftImportKeys(map[string]any{
		"source_site": " B-AutomationService ",
		"listing_id":  json.Number("12345"),
		"source_url":  "HTTPS://EXAMPLE.COM/Products/Test/",
	})
	if listingKey != "b-automationservice|12345" {
		t.Fatalf("unexpected listing key: %q", listingKey)
	}
	if sourceURL != "https://example.com/products/test" {
		t.Fatalf("unexpected source URL: %q", sourceURL)
	}
}

func TestEbayDraftJSONTaskPauseAndResume(t *testing.T) {
	task := &ebayDraftJSONImportTask{Status: EbayDraftJSONTaskProcessing}
	task.cond = sync.NewCond(&task.mu)
	paused, err := task.pause()
	if err != nil {
		t.Fatalf("pause returned error: %v", err)
	}
	if paused.Status != EbayDraftJSONTaskPaused {
		t.Fatalf("pause status = %q", paused.Status)
	}
	resumed, err := task.resume()
	if err != nil {
		t.Fatalf("resume returned error: %v", err)
	}
	if resumed.Status != EbayDraftJSONTaskProcessing {
		t.Fatalf("resume status = %q", resumed.Status)
	}
}
