package controllers

import "testing"

func TestParseAICategorySEODescription(t *testing.T) {
	raw := "```json\n{\"description\": \"Shop genuine FANUC servo amplifiers including A06B-6114 and A06B-6117 series modules. Each unit is tested before dispatch and covers current, legacy and obsolete CNC systems.\"}\n```"
	description, err := parseAICategorySEODescription(raw)
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	if len(description) < 40 {
		t.Fatalf("unexpected description: %q", description)
	}
}

func TestParseAICategorySEODescriptionRejectsShort(t *testing.T) {
	if _, err := parseAICategorySEODescription(`{"description": "Too short."}`); err == nil {
		t.Fatalf("short description should be rejected")
	}
}

func TestAICategorySEONeedsDescription(t *testing.T) {
	if !aiCategorySEONeedsDescription("") {
		t.Fatalf("empty description needs SEO")
	}
	if !aiCategorySEONeedsDescription("FANUC industrial automation parts") {
		t.Fatalf("auto-generated boilerplate needs SEO")
	}
	full := "Shop genuine FANUC servo amplifiers including A06B-6114 and A06B-6117 series modules, tested before dispatch with warranty coverage."
	if aiCategorySEONeedsDescription(full) {
		t.Fatalf("complete description must be kept")
	}
}
