package controllers

import "testing"

func TestNormalizeHomepageSectionKey(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
		valid bool
	}{
		{name: "valid", input: "custom_banner", want: "custom_banner", valid: true},
		{name: "trimmed", input: "  custom_2  ", want: "custom_2", valid: true},
		{name: "uppercase", input: "CustomBanner", want: "CustomBanner", valid: false},
		{name: "hyphen", input: "custom-banner", want: "custom-banner", valid: false},
		{name: "too short", input: "ab", want: "ab", valid: false},
		{name: "path", input: "custom/banner", want: "custom/banner", valid: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, valid := normalizeHomepageSectionKey(tt.input)
			if got != tt.want || valid != tt.valid {
				t.Fatalf("normalizeHomepageSectionKey(%q) = (%q, %v), want (%q, %v)", tt.input, got, valid, tt.want, tt.valid)
			}
		})
	}
}

func TestIsPredefinedHomepageSectionKey(t *testing.T) {
	if !isPredefinedHomepageSectionKey("hero_section") {
		t.Fatal("hero_section should be predefined")
	}
	if isPredefinedHomepageSectionKey("custom_banner") {
		t.Fatal("custom_banner should not be predefined")
	}
}
