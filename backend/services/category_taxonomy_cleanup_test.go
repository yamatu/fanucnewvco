package services

import (
	"testing"

	"fanuc-backend/models"
)

func cleanupTestUintPtr(value uint) *uint { return &value }

func TestBuildCategoryCleanupPlanMergesDuplicateSiblings(t *testing.T) {
	categories := []models.Category{
		{ID: 1, Name: "FANUC", Slug: "fanuc", IsActive: true},
		{ID: 2, Name: "Servo Drives", Slug: "fanuc-servo-drives", ParentID: cleanupTestUintPtr(1), IsActive: true},
		{ID: 3, Name: "Servo Drive", Slug: "fanuc-servo-drives-2", ParentID: cleanupTestUintPtr(1), IsActive: true},
		{ID: 4, Name: "Legacy Child", Slug: "legacy-child", ParentID: cleanupTestUintPtr(3), IsActive: true},
	}
	counts := map[uint]int64{2: 10, 3: 2, 4: 1}

	plan := buildCategoryCleanupPlan(categories, counts, CategoryCleanupOptions{MergeDuplicates: true})
	if len(plan.Merges) != 1 {
		t.Fatalf("expected 1 merge, got %d: %+v", len(plan.Merges), plan.Merges)
	}
	merge := plan.Merges[0]
	if merge.SourceID != 3 || merge.TargetID != 2 {
		t.Fatalf("expected merge of 3 into 2, got source=%d target=%d", merge.SourceID, merge.TargetID)
	}
	if merge.ProductCount != 2 || merge.ChildCount != 1 {
		t.Fatalf("unexpected merge counts: %+v", merge)
	}
}

func TestBuildCategoryCleanupPlanCascadingMerges(t *testing.T) {
	// Two duplicate brand roots each hold a "PLC Modules" child. Merging the
	// roots must surface the children as new duplicate siblings in a later pass.
	categories := []models.Category{
		{ID: 1, Name: "Siemens", Slug: "siemens", IsActive: true},
		{ID: 2, Name: "SIEMENS", Slug: "siemens-2", IsActive: true},
		{ID: 3, Name: "PLC Modules", Slug: "siemens-plc-modules", ParentID: cleanupTestUintPtr(1), IsActive: true},
		{ID: 4, Name: "PLC Module", Slug: "siemens-plc-module", ParentID: cleanupTestUintPtr(2), IsActive: true},
	}
	counts := map[uint]int64{3: 5, 4: 3}

	plan := buildCategoryCleanupPlan(categories, counts, CategoryCleanupOptions{MergeDuplicates: true})
	if len(plan.Merges) != 2 {
		t.Fatalf("expected 2 merges (root then child), got %d: %+v", len(plan.Merges), plan.Merges)
	}
	if plan.Merges[0].SourceID != 2 || plan.Merges[0].TargetID != 1 {
		t.Fatalf("expected root merge of 2 into 1, got %+v", plan.Merges[0])
	}
	if plan.Merges[1].SourceID != 4 || plan.Merges[1].TargetID != 3 {
		t.Fatalf("expected child merge of 4 into 3, got %+v", plan.Merges[1])
	}
}

func TestBuildCategoryCleanupPlanDeletesEmptySubtrees(t *testing.T) {
	categories := []models.Category{
		{ID: 1, Name: "FANUC", Slug: "fanuc", IsActive: true},
		{ID: 2, Name: "Servo Drives", Slug: "fanuc-servo-drives", ParentID: cleanupTestUintPtr(1), IsActive: true},
		{ID: 3, Name: "Old Imports", Slug: "old-imports", IsActive: false},
		{ID: 4, Name: "Old Child", Slug: "old-child", ParentID: cleanupTestUintPtr(3), IsActive: false},
		{ID: 5, Name: "Visible Empty", Slug: "visible-empty", IsActive: true},
	}
	counts := map[uint]int64{2: 4}

	plan := buildCategoryCleanupPlan(categories, counts, CategoryCleanupOptions{DeleteEmpty: true})
	deleted := map[uint]bool{}
	for _, deletion := range plan.Deletions {
		deleted[deletion.ID] = true
	}
	if !deleted[3] || !deleted[4] {
		t.Fatalf("expected hidden empty subtree 3/4 to be deleted, got %+v", plan.Deletions)
	}
	if deleted[1] || deleted[2] {
		t.Fatalf("populated tree must never be deleted, got %+v", plan.Deletions)
	}
	if deleted[5] {
		t.Fatalf("active empty category must be kept unless DeleteEmptyActive is set")
	}

	plan = buildCategoryCleanupPlan(categories, counts, CategoryCleanupOptions{DeleteEmpty: true, DeleteEmptyActive: true})
	deleted = map[uint]bool{}
	for _, deletion := range plan.Deletions {
		deleted[deletion.ID] = true
	}
	if !deleted[5] {
		t.Fatalf("DeleteEmptyActive should include visible empty categories, got %+v", plan.Deletions)
	}
}

func TestComposeStandardProductTitle(t *testing.T) {
	cases := []struct {
		brand, model, partType, want string
	}{
		{"FANUC", "A06B-6114-H105", "Servo Amplifier", "FANUC A06B-6114-H105 Servo Amplifier"},
		{"Siemens", "SIEMENS 6ES7-407", "Power Supply", "SIEMENS 6ES7-407 Power Supply"},
		{"ABB", "ACS550-01", "Variable Frequency Drive", "ABB ACS550-01 Variable Frequency Drive"},
	}
	for _, testCase := range cases {
		got := composeStandardProductTitle(testCase.brand, testCase.model, testCase.partType)
		if got != testCase.want {
			t.Errorf("composeStandardProductTitle(%q, %q, %q) = %q, want %q", testCase.brand, testCase.model, testCase.partType, got, testCase.want)
		}
	}
}

func TestProposeStandardProductTitleSkipsUnverified(t *testing.T) {
	product := models.Product{ID: 9, SKU: "UNKNOWN-1", Name: "Mystery Part", Model: "XYZ123"}
	proposal := ProposeStandardProductTitle(product)
	if proposal.Status != "unresolved" {
		t.Fatalf("unverifiable product must stay unresolved, got %q (%+v)", proposal.Status, proposal)
	}
}
