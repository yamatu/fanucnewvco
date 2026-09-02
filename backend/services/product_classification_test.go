package services

import "testing"

func TestIsConfirmedProductCategoryRejectsFallbacks(t *testing.T) {
	confirmed := InferProductCategory("FANUC", "A03B-0819-C011")
	if !IsConfirmedProductCategory(confirmed, "A03B-0819-C011") {
		t.Fatalf("expected known FANUC I/O model to be confirmed: %#v", confirmed)
	}

	unconfirmed := InferProductCategory("FANUC", "UNKNOWN-PART-123")
	if IsConfirmedProductCategory(unconfirmed, "UNKNOWN-PART-123") {
		t.Fatalf("fallback inference must not be publishable: %#v", unconfirmed)
	}
	if got := ClassificationFailureReason(unconfirmed, "UNKNOWN-PART-123"); got == "" {
		t.Fatal("expected a stable classification failure reason")
	}
}

func TestIsConfirmedProductCategoryRequiresBrand(t *testing.T) {
	inference := InferProductCategory("", "PART-123")
	if IsConfirmedProductCategory(inference, "PART-123") {
		t.Fatalf("generic category without a verified brand must remain unresolved: %#v", inference)
	}
}

func TestIsConfirmedProductCategoryRequiresVerifiedBrand(t *testing.T) {
	inference := InferProductCategory("Acme", "SERVO-MOTOR-123")
	if IsConfirmedProductCategory(inference, "SERVO-MOTOR-123") {
		t.Fatalf("free-form brand keyword must not be publishable without evidence: %#v", inference)
	}
	webInference := inference
	webInference.MatchRule = "web:generic:servo-motor-keyword"
	if !IsConfirmedProductCategory(webInference, "SERVO-MOTOR-123") {
		t.Fatalf("web-verified custom brand should be publishable: %#v", webInference)
	}
}

func TestIsConfirmedProductCategoryRejectsBareGenericKeywords(t *testing.T) {
	tests := []struct{ brand, model string }{
		{brand: "FANUC", model: "SERVO-MOTOR-123"},
		{brand: "FANUC", model: "POWER-METER-500"},
		{brand: "FANUC", model: "INPUT-FILTER-24V"},
		{brand: "FANUC", model: "SENSOR-ABC"},
		{brand: "Allen-Bradley", model: "IO-MODULE-123"},
		{brand: "SICK", model: "SAFETY-SENSOR-123"},
		{brand: "Tamagawa", model: "SERVO-DRIVER-123"},
	}
	for _, tt := range tests {
		inference := InferProductCategory(tt.brand, tt.model)
		if IsConfirmedProductCategory(inference, tt.model) {
			t.Fatalf("generic keyword model %q must require stronger evidence: %#v", tt.model, inference)
		}
	}
}

func TestCategoryPathMatchesBrandAndType(t *testing.T) {
	inference := InferProductCategory("ABB", "ACS800-104")
	if !IsConfirmedProductCategory(inference, "ACS800-104") {
		t.Fatalf("expected ABB drive model to be confirmed: %#v", inference)
	}
	if !CategoryPathMatchesInference("ABB > Drives > Variable Frequency Drives", inference) {
		t.Fatalf("expected ABB drive path to match: %#v", inference)
	}
	if CategoryPathMatchesInference("ABB > PLCs", inference) {
		t.Fatalf("PLC category must not match ABB drive inference")
	}
}

func TestBrandAliasesAndABFamilyClassification(t *testing.T) {
	if got := NormalizeBrandKey("Rockwell Automation"); got != "allen-bradley" {
		t.Fatalf("rockwell alias mismatch: got %q", got)
	}
	if got := CanonicalBrandName("AB"); got != "Allen-Bradley" {
		t.Fatalf("AB canonical name mismatch: got %q", got)
	}

	rio := InferProductCategory("Rockwell", "1756-RIO")
	if rio.BrandKey != "allen-bradley" || rio.ModelFamily != "1756-RIO" || rio.CategorySlug != "1756-rio-i-o-modules" {
		t.Fatalf("unexpected 1756-RIO inference: %#v", rio)
	}
	if !CategoryPathMatchesInference("1756-RIO I/O Modules", rio) {
		t.Fatal("1756-RIO family category should match without a duplicated AB parent")
	}
	if CategoryPathMatchesInference("Siemens > I/O Modules", rio) {
		t.Fatal("a Siemens category must not match an Allen-Bradley product")
	}

	og16 := InferProductCategory("AB", "1769-OG16")
	if og16.ModelFamily != "1769-OG16" || og16.CategorySlug != "1769-og16-spare-parts" {
		t.Fatalf("unexpected 1769-OG16 inference: %#v", og16)
	}
	if !CategoryPathMatchesInference("1769-OG16 Spare Parts", og16) {
		t.Fatal("1769-OG16 family category should match")
	}
}

func TestModelFamilyCategoriesBeatGenericTypeNodes(t *testing.T) {
	got := InferProductCategory("Siemens AG", "6ES7-1511-1AA03-0AB0")
	if got.BrandKey != "siemens" || got.ModelFamily != "S7-1500" {
		t.Fatalf("expected Siemens S7-1500 family inference: %#v", got)
	}
	if !CategoryPathMatchesInference("Siemens > S7-1500 PLC Spare Parts", got) {
		t.Fatal("S7-1500 family node should match")
	}
	if CategoryPathMatchesInference("Siemens > Servo Motors", got) {
		t.Fatal("S7-1500 PLC must not match servo motor category")
	}

	mrj4 := InferProductCategory("MELSEC", "MR-J4-20A")
	if mrj4.BrandKey != "mitsubishi" || mrj4.ModelFamily != "MR-J4" {
		t.Fatalf("expected Mitsubishi MR-J4 family inference: %#v", mrj4)
	}
	if !CategoryPathMatchesInference("Mitsubishi > MELSERVO MR-J4", mrj4) {
		t.Fatal("MELSERVO MR-J4 node should match")
	}
	if CategoryPathMatchesInference("Mitsubishi > MELSERVO MR-J3", mrj4) {
		t.Fatal("MR-J4 must not match MR-J3")
	}
}

func TestFineGrainedManufacturerFamilies(t *testing.T) {
	tests := []struct {
		brand, model, family, path string
	}{
		{brand: "Siemens", model: "6ES7511-1AK02-0AB0", family: "S7-1500", path: "Siemens > S7-1500 PLC Spare Parts"},
		{brand: "Siemens", model: "6ES7321-1BL00-0AA0", family: "S7-300", path: "Siemens > S7-300 PLC Spare Parts"},
		{brand: "Mitsubishi", model: "HF-KP43", family: "HF", path: "Mitsubishi > HF Series"},
		{brand: "Mitsubishi", model: "HC-SF52", family: "HC", path: "Mitsubishi > MELSERVO HC"},
		{brand: "Mitsubishi", model: "HG-KR43", family: "HG", path: "Mitsubishi > HG Series"},
		{brand: "Mitsubishi", model: "HK-ST202W", family: "HK-ST", path: "HK-ST Series Servo Motors"},
		{brand: "Tamagawa", model: "TS2640N321E64", path: "Tamagawa > Tamagawa Resolvers / Synchros"},
		{brand: "Tamagawa", model: "TS5213N551", path: "Tamagawa > Tamagawa Rotary Encoders"},
	}
	for _, tt := range tests {
		t.Run(tt.brand+"/"+tt.model, func(t *testing.T) {
			inference := InferProductCategory(tt.brand, tt.model)
			if !IsConfirmedProductCategory(inference, tt.model) {
				t.Fatalf("known manufacturer family should be confirmed: %#v", inference)
			}
			if tt.family != "" && inference.ModelFamily != tt.family {
				t.Fatalf("model family = %q, want %q: %#v", inference.ModelFamily, tt.family, inference)
			}
			if !CategoryPathMatchesInference(tt.path, inference) {
				t.Fatalf("path %q should match: %#v", tt.path, inference)
			}
		})
	}
}

func TestSiemensUnknown6ESFamilyIsNotForcedIntoIO(t *testing.T) {
	inference := InferProductCategory("Siemens", "6ES7999-9XX99-9XX9")
	if IsConfirmedProductCategory(inference, "6ES7999-9XX99-9XX9") {
		t.Fatalf("unknown 6ES family should require web evidence: %#v", inference)
	}
}

func TestSiemensMicromasterAccessoryFamilies(t *testing.T) {
	tests := []struct {
		model    string
		partType string
		path     string
	}{
		{model: "6SE6400-3CC02-6BB3", partType: "Line Reactor", path: "Siemens > Line Reactors"},
		{model: "6SE6400-3CC04-4DD0", partType: "Line Reactor", path: "Siemens > Line Reactors"},
		{model: "6SE6400-3CC03-5CD0", partType: "Line Reactor", path: "Siemens > Line Reactors"},
		{model: "6SE6400-3CC08-3ED0", partType: "Line Reactor", path: "Siemens > Line Reactors"},
		{model: "6SE6400-3TC03-2CD3", partType: "Output Reactor", path: "Siemens > Output Reactors"},
		{model: "6SE6400-3TC14-5FD0", partType: "Output Reactor", path: "Siemens > Output Reactors"},
		{model: "6SE6400-3TD01-0CE0", partType: "Output LC Filter", path: "Siemens > Output LC Filters"},
	}

	for _, tt := range tests {
		t.Run(tt.model, func(t *testing.T) {
			inference := InferProductCategory("", tt.model)
			if !IsConfirmedProductCategory(inference, tt.model) {
				t.Fatalf("known Siemens MICROMASTER accessory should be confirmed: %#v", inference)
			}
			if inference.BrandKey != "siemens" || inference.PartType != tt.partType {
				t.Fatalf("unexpected inference: %#v", inference)
			}
			if !CategoryPathMatchesInference(tt.path, inference) {
				t.Fatalf("path %q should match: %#v", tt.path, inference)
			}
			if CategoryPathMatchesInference("Siemens > Variable Frequency Drives", inference) {
				t.Fatalf("MICROMASTER accessory must not be classified as a VFD: %#v", inference)
			}
		})
	}
}

func TestGenericTopLevelCategoryIsNotAutomaticTarget(t *testing.T) {
	inference := InferProductCategory("ABB", "ACS800-104")
	if CategoryPathMatchesInference("Variable Frequency Drives", inference) {
		t.Fatal("generic top-level type category must not be selected without brand/family evidence")
	}
}

func TestBrandTypePathCanMatchABGenericIO(t *testing.T) {
	inference := InferProductCategory("AB", "1756-IB16")
	if !IsConfirmedProductCategory(inference, "1756-IB16") {
		t.Fatalf("expected 1756 input module to be classified: %#v", inference)
	}
	if !CategoryPathMatchesInference("AB > I/O Modules", inference) {
		t.Fatalf("AB brand/type path should match: %#v", inference)
	}
}

func TestOmronKnownFamiliesUseBrandTypeTaxonomy(t *testing.T) {
	inference := InferProductCategory("OMRON", "CJ1W-ID211")
	if !IsConfirmedProductCategory(inference, "CJ1W-ID211") {
		t.Fatalf("known OMRON CJ1W family should be confirmed: %#v", inference)
	}
	if !CategoryPathMatchesInference("OMRON > I/O Modules", inference) {
		t.Fatalf("OMRON CJ1W should match the OMRON I/O leaf: %#v", inference)
	}
	if CategoryPathMatchesInference("Siemens > I/O Modules", inference) {
		t.Fatal("OMRON product must not match a Siemens I/O category")
	}
}

func TestExactGenericSlugStillNeedsBrandPath(t *testing.T) {
	inference := InferProductCategory("FANUC", "A06B-6114-H103")
	if CategoryPathMatchesInference("Servo Amplifiers / Drives", inference) {
		t.Fatal("an exact generic servo slug must not bypass the brand-parent requirement")
	}
}

func TestCategoryTypeMatchingRejectsNearbyButDifferentTypes(t *testing.T) {
	tests := []struct {
		path     string
		partType string
	}{
		{path: "FANUC > Power Meters", partType: "Power Supply Unit"},
		{path: "FANUC > Input Filters", partType: "I/O Module"},
		{path: "FANUC > Sensor Power Supplies", partType: "Sensor"},
		{path: "FANUC > Input Filters", partType: "Fan / Cooling Unit"},
		{path: "SICK > SICK Proximity Sensors", partType: "Photoelectric Sensor"},
		{path: "SICK > SICK Vision Sensors", partType: "Distance Sensor"},
		{path: "SICK > SICK Safety Laser Scanners", partType: "Safety Light Curtain"},
		{path: "OMRON > Power Supplies", partType: "Power Module"},
		{path: "Mitsubishi > Temperature Input Modules", partType: "I/O Module"},
	}
	for _, tt := range tests {
		inference := ProductCategoryInference{BrandKey: "fanuc", BrandName: "FANUC", PartType: tt.partType, MatchRule: "fanuc:test"}
		if CategoryPathMatchesInference(tt.path, inference) {
			t.Fatalf("path %q must not match product type %q", tt.path, tt.partType)
		}
	}
}

func TestSeriesRulesDoNotCollapseDifferentComponentTypes(t *testing.T) {
	tests := []struct {
		brand, model, wantType string
		confirmed              bool
	}{
		{brand: "Allen-Bradley", model: "1756-EN2T", wantType: "Communication Processor", confirmed: true},
		{brand: "Allen-Bradley", model: "1756-PA75", wantType: "Power Supply Unit", confirmed: true},
		{brand: "Allen-Bradley", model: "1756-L83E", wantType: "Programmable Logic Controller", confirmed: true},
		{brand: "OMRON", model: "CJ1W-PA202", wantType: "Power Supply Unit", confirmed: true},
		{brand: "OMRON", model: "CJ1W-CLK21", confirmed: false},
	}
	for _, tt := range tests {
		t.Run(tt.brand+"/"+tt.model, func(t *testing.T) {
			inference := InferProductCategory(tt.brand, tt.model)
			if got := IsConfirmedProductCategory(inference, tt.model); got != tt.confirmed {
				t.Fatalf("confirmed = %v, want %v: %#v", got, tt.confirmed, inference)
			}
			if tt.wantType != "" && inference.PartType != tt.wantType {
				t.Fatalf("part type = %q, want %q: %#v", inference.PartType, tt.wantType, inference)
			}
		})
	}
	if inference := InferProductCategory("Allen-Bradley", "1756-EN2T"); CategoryPathMatchesInference("1756-RIO I/O Modules", inference) {
		t.Fatal("1756-EN2T must not fall into the 1756-RIO family leaf")
	}
}

func TestWebEvidenceUsesWholeTokensForTypeInference(t *testing.T) {
	communication := InferProductCategoryFromEvidence("Siemens", "COMMUNICATION-PROCESSOR-123", "Siemens COMMUNICATION-PROCESSOR-123 communication processor module")
	if communication.PartType != "Communication Interface Module" || !IsConfirmedProductCategory(communication, "COMMUNICATION-PROCESSOR-123") {
		t.Fatalf("communication evidence must not be reduced to I/O: %#v", communication)
	}
	cabinet := InferProductCategoryFromEvidence("FANUC", "CABINET-123", "FANUC CABINET-123 industrial control cabinet module")
	if cabinet.PartType == "Cable / Connector" {
		t.Fatalf("CABINET token must not be treated as CAB cable evidence: %#v", cabinet)
	}
}

func TestFanucA98LBatteryIsReachable(t *testing.T) {
	inference := InferProductCategory("", "A98L-0031-0025")
	if !IsConfirmedProductCategory(inference, "A98L-0031-0025") || inference.PartType != "Battery" {
		t.Fatalf("known FANUC A98L battery should be confirmed: %#v", inference)
	}
	if !CategoryPathMatchesInference("Fanuc > FANUC Battery", inference) {
		t.Fatalf("FANUC battery leaf should be reachable: %#v", inference)
	}
}

func TestSuppliedTaxonomyPaths(t *testing.T) {
	tests := []struct {
		name      string
		brand     string
		model     string
		path      string
		wantMatch bool
	}{
		{name: "FANUC servo motor", brand: "FANUC", model: "A06B-0123-B077", path: "Fanuc > FANUC Servo Motor", wantMatch: true},
		{name: "FANUC drive", brand: "FANUC", model: "A06B-6114-H103", path: "Fanuc > FANUC Servo Amplifier / Drive", wantMatch: true},
		{name: "ABB family", brand: "ABB", model: "ACS800-104", path: "ACS800-104 Spare Parts", wantMatch: true},
		{name: "Siemens family", brand: "Siemens", model: "6ES7-1511-1AA03-0AB0", path: "Siemens > S7-1500 PLC Spare Parts", wantMatch: true},
		{name: "Mitsubishi family", brand: "Mitsubishi", model: "MR-J4-20A", path: "Mitsubishi > MELSERVO MR-J4", wantMatch: true},
		{name: "OMRON I/O", brand: "OMRON", model: "CJ1W-ID211", path: "OMRON > I/O Modules", wantMatch: true},
		{name: "SICK photoelectric", brand: "SICK", model: "WTB4-3P2161", path: "SICK > SICK Photoelectric Sensors", wantMatch: true},
		{name: "SICK scanner", brand: "SICK", model: "S300-STD2", path: "SICK > SICK Safety Laser Scanners", wantMatch: true},
		{name: "Tamagawa resolver", brand: "Tamagawa", model: "TS2640N321E64", path: "Tamagawa > Tamagawa Resolvers / Synchros", wantMatch: true},
		{name: "mixed generic", brand: "FANUC", model: "A06B-0123-B077", path: "Industrial Automation Spare Parts > Industrial Automation Servo Motors", wantMatch: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			inference := InferProductCategory(tt.brand, tt.model)
			if got := CategoryPathMatchesInference(tt.path, inference); got != tt.wantMatch {
				t.Fatalf("path match = %v, want %v; inference=%#v", got, tt.wantMatch, inference)
			}
		})
	}
}
