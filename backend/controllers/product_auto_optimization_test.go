package controllers

import (
	"testing"

	"fanuc-backend/models"
)

// An administrator who enables a product in the admin form keeps it enabled:
// the model-only classifier may fill content, but it must not unpublish a
// product whose classification it could not confirm.
func TestAutoClassificationNeverUnpublishesManualActivation(t *testing.T) {
	cases := []struct {
		name               string
		wasActive          bool
		categoryChanged    bool
		preserveActivation bool
		wantInactive       bool
	}{
		{name: "manual activation survives an unresolved model", wasActive: true, preserveActivation: true, wantInactive: false},
		{name: "manual activation survives a category edit", wasActive: false, categoryChanged: true, preserveActivation: true, wantInactive: false},
		{name: "automatic flow still hides an unresolved active product", wasActive: true, preserveActivation: false, wantInactive: true},
		{name: "automatic flow still hides a category change", wasActive: false, categoryChanged: true, preserveActivation: false, wantInactive: true},
		{name: "inactive automatic flow is untouched", wasActive: false, preserveActivation: false, wantInactive: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := autoClassificationForcesInactive(tc.wasActive, tc.categoryChanged, tc.preserveActivation)
			if got != tc.wantInactive {
				t.Fatalf("autoClassificationForcesInactive() = %v, want %v", got, tc.wantInactive)
			}
		})
	}
}

func TestPreservedActivationSkipsThePublicationGate(t *testing.T) {
	product := models.Product{IsActive: true}
	if shouldEnforcePublicationGate(product, false) {
		t.Fatal("a preserved manual activation must not be re-validated")
	}
	if !shouldEnforcePublicationGate(product, true) {
		t.Fatal("automatic flows must still validate the taxonomy before publishing")
	}
	if shouldEnforcePublicationGate(models.Product{IsActive: false}, true) {
		t.Fatal("an inactive product has nothing to gate")
	}
}

func TestPreferExistingDescriptionKeepsManualCopy(t *testing.T) {
	manual := "Hand-written description.\n\nSecond paragraph."
	imported := "<p>Imported competitor copy</p>"

	if got := preferExistingDescription(manual, imported); got != manual {
		t.Fatalf("manual description must win, got %q", got)
	}
	if got := preferExistingDescription("", imported); got != imported {
		t.Fatalf("empty description must accept imported copy, got %q", got)
	}
	if got := preferExistingDescription(manual, ""); got != manual {
		t.Fatalf("missing imported copy must not clear the description, got %q", got)
	}
	if got := preferExistingDescription("  ", imported); got != imported {
		t.Fatalf("whitespace-only description must accept imported copy, got %q", got)
	}
}
