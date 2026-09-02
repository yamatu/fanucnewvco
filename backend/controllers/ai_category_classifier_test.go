package controllers

import (
	"testing"
)

func TestParseAICategoryClassificationHandlesMarkdownFence(t *testing.T) {
	raw := "```json\n{\"brand\": \"Heidenhain\", \"part_type\": \"Encoder\", \"model_family\": \"ERN\", \"confidence\": 0.92, \"reason\": \"ERN 480 is a Heidenhain rotary encoder series.\"}\n```"
	classification, err := parseAICategoryClassification(raw)
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	if classification.Brand != "Heidenhain" || classification.PartType != "Encoder" || classification.Confidence != 0.92 {
		t.Fatalf("unexpected classification: %+v", classification)
	}
}

func TestValidateAICategoryClassificationAcceptsUnknownBrand(t *testing.T) {
	inference, err := validateAICategoryClassification(aiCategoryClassification{
		Brand: "Heidenhain", PartType: "Encoder", Confidence: 0.9,
	})
	if err != nil {
		t.Fatalf("validation failed: %v", err)
	}
	if inference.BrandName != "Heidenhain" || inference.PartType != "Encoder" {
		t.Fatalf("unexpected inference: %+v", inference)
	}
	if inference.MatchRule != "llm:type:encoder" {
		t.Fatalf("unexpected match rule %q", inference.MatchRule)
	}
}

func TestValidateAICategoryClassificationRejections(t *testing.T) {
	cases := []aiCategoryClassification{
		{Brand: "Heidenhain", PartType: "Encoder", Confidence: 0.5},
		{Brand: "", PartType: "Encoder", Confidence: 0.9},
		{Brand: "Heidenhain", PartType: "Spare Part", Confidence: 0.9},
		{Brand: "unknown", PartType: "Encoder", Confidence: 0.9},
	}
	for index, classification := range cases {
		if _, err := validateAICategoryClassification(classification); err == nil {
			t.Errorf("case %d should be rejected: %+v", index, classification)
		}
	}
}
