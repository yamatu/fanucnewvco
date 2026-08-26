package services

import (
	"testing"

	"fanuc-backend/models"
)

func TestEvaluateProductSEOFlagsStaleMetadata(t *testing.T) {
	cases := []struct {
		name    string
		product models.Product
		want    string
	}{
		{
			name:    "failed run",
			product: models.Product{IsActive: true, AISEOStatus: "failed", MetaTitle: "x", MetaDescription: "y"},
			want:    SEOIssueFailed,
		},
		{
			name:    "missing meta",
			product: models.Product{IsActive: true, AISEOStatus: "optimized", MetaTitle: "", MetaDescription: "y"},
			want:    SEOIssueMissingMeta,
		},
		{
			name: "generic catch-all wording",
			product: models.Product{
				IsActive: true, AISEOStatus: "optimized", Model: "A06B-6114-H105", Brand: "FANUC",
				MetaTitle:       "Industrial Automation Spare Parts A06B-6114-H105",
				MetaDescription: "Buy industrial automation spare parts online.",
			},
			want: SEOIssueGenericMeta,
		},
		{
			name: "brand mismatch from old classification",
			product: models.Product{
				IsActive: true, AISEOStatus: "optimized", Model: "6ES7407-0KA02", Brand: "Siemens",
				MetaTitle:       "FANUC 6ES7407-0KA02 Power Supply | Buy Online",
				MetaDescription: "Power supply module in stock.",
			},
			want: SEOIssueBrandMismatch,
		},
		{
			name: "meta title built from category name without the model",
			product: models.Product{
				IsActive: true, AISEOStatus: "optimized", Model: "A06B-6114-H105", Brand: "FANUC",
				MetaTitle:       "Servo Amplifiers | FANUC Parts Supplier",
				MetaDescription: "FANUC servo amplifiers for CNC machines.",
			},
			want: SEOIssueModelMissing,
		},
		{
			name: "healthy optimized product",
			product: models.Product{
				IsActive: true, AISEOStatus: "optimized", Model: "A06B-6114-H105", Brand: "FANUC",
				MetaTitle:       "FANUC A06B-6114-H105 Servo Amplifier | In Stock",
				MetaDescription: "Genuine FANUC A06B-6114-H105 servo amplifier, tested with warranty.",
			},
			want: "",
		},
		{
			name:    "inactive products are ignored",
			product: models.Product{IsActive: false, AISEOStatus: "", MetaTitle: "", MetaDescription: ""},
			want:    "",
		},
	}
	for _, testCase := range cases {
		issue, detail := evaluateProductSEO(testCase.product)
		if issue != testCase.want {
			t.Errorf("%s: expected %q, got %q (%s)", testCase.name, testCase.want, issue, detail)
		}
	}
}

func TestEvaluateProductSEONeverOptimizedComesLast(t *testing.T) {
	product := models.Product{
		IsActive: true, AISEOStatus: "", Model: "A06B-6114-H105", Brand: "FANUC",
		MetaTitle:       "FANUC A06B-6114-H105 Servo Amplifier",
		MetaDescription: "Manually written but complete metadata.",
	}
	issue, _ := evaluateProductSEO(product)
	if issue != SEOIssueNeverOptimized {
		t.Fatalf("expected never_optimized for complete manual metadata, got %q", issue)
	}
}
