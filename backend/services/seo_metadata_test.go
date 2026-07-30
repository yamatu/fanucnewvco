package services

import "testing"

func TestBuildSafeMetaDescriptionPrefersCompleteCandidate(t *testing.T) {
	long := "FANUC A06B-6092-H275#H508 FANUC Servo Amplifier / Drive for industrial automation repair and replacement. Compatibility support, 12-month warranty, and fast worldwide shipping."
	complete := "FANUC A06B-6092-H275#H508 spindle amplifier for CNC repair. Includes compatibility support, a 12-month warranty and worldwide shipping."

	got := BuildSafeMetaDescription(long, complete)
	if got != complete {
		t.Fatalf("expected complete fallback %q, got %q", complete, got)
	}
}

func TestBuildSafeMetaDescriptionRejectsTruncatedEnding(t *testing.T) {
	truncated := "FANUC amplifier with compatibility support, 12-month warranty, and fast."
	complete := "FANUC amplifier for CNC repair with compatibility support and worldwide shipping."

	if got := BuildSafeMetaDescription(truncated, complete); got != complete {
		t.Fatalf("expected %q, got %q", complete, got)
	}
}
