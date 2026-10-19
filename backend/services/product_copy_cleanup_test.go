package services

import (
	"strings"
	"testing"

	"fanuc-backend/models"
)

func TestStripModelAnnotation(t *testing.T) {
	cases := map[string]string{
		"ACS355-03U-08A8-4-(ACS355-SERIES)": "ACS355-03U-08A8-4",
		"ACS355-03U-08A8-4 (ACS355 Series)": "ACS355-03U-08A8-4",
		"A06B-6079-H101":                    "A06B-6079-H101",
		"A06B-6114-H105#H580":               "A06B-6114-H105#H580",
		"(ONLY NOTE)":                       "(ONLY NOTE)",
	}
	for in, want := range cases {
		if got := stripModelAnnotation(in); got != want {
			t.Errorf("stripModelAnnotation(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestMetaTitleHasNoDanglingSeparator(t *testing.T) {
	long := "ABB ACS355-03U-08A8-4-(ACS355-SERIES) Variable Frequency Drive | Vibocnc"
	title := BuildSafeMetaTitle(long, "ABB ACS355-03U-08A8-4 | Vibocnc")
	if title != "ABB ACS355-03U-08A8-4 | Vibocnc" {
		t.Fatalf("expected the candidate that fits whole, got %q", title)
	}
	if got := NormalizeMetaTitle(long); strings.HasSuffix(got, "|") || strings.HasSuffix(got, " ") {
		t.Fatalf("clipped title keeps separator: %q", got)
	}
}

func TestBuildSafeMetaTitleKeepsFirstCandidateWhenItFits(t *testing.T) {
	first := "FANUC A06B-6079-H101 Servo Amplifier / Drive | Vibocnc"
	if got := BuildSafeMetaTitle(first, "FANUC A06B-6079-H101 | Vibocnc"); got != first {
		t.Fatalf("expected %q, got %q", first, got)
	}
}

func TestGeneratedCopyDropsModelAnnotation(t *testing.T) {
	outputs := map[string]EnrichedProduct{}
	if out, err := EnrichProductByBrand("ABB", "ACS355-03U-08A8-4 (ACS355 Series)"); err == nil {
		outputs["abb"] = out
	} else {
		t.Fatalf("EnrichProductByBrand: %v", err)
	}
	outputs["generic"] = GenericEnrich("ACS355-03U-08A8-4 (ACS355 Series)")
	outputs["defaults"] = BuildDefaultProductSEO(&models.Product{
		Brand: "ABB",
		Model: "ACS355-03U-08A8-4 (ACS355 Series)",
		SKU:   "ACS355-03U-08A8-4",
	})

	for name, out := range outputs {
		all := strings.Join([]string{
			out.Name, out.Description, out.MetaTitle, out.MetaDescription,
			out.CompatibilityInfo, out.InstallationGuide, out.MaintenanceTips,
		}, "\n")
		for _, bad := range []string{"(ACS355", "SERIES)", "axis assignment", "amplifier rating"} {
			if strings.Contains(strings.ToUpper(all), strings.ToUpper(bad)) {
				t.Errorf("%s copy should not contain %q:\n%s", name, bad, all)
			}
		}
		if strings.HasSuffix(strings.TrimSpace(out.MetaTitle), "|") {
			t.Errorf("%s meta title ends with a separator: %q", name, out.MetaTitle)
		}
		if !strings.Contains(out.MetaTitle, "ACS355-03U-08A8-4") {
			t.Errorf("%s meta title lost the model: %q", name, out.MetaTitle)
		}
	}
}
