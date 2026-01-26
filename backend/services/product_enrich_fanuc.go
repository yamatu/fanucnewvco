package services

import (
	"fmt"
	"regexp"
	"strings"
)

type EnrichedProduct struct {
	Name             string
	ShortDescription string
	Description      string
	MetaTitle        string
	MetaDescription  string
	MetaKeywords     string
	PartType         string
	CategorySlug     string
}

var (
	reFanucA02B  = regexp.MustCompile(`(?i)^A02B`)
	reFanucA03B  = regexp.MustCompile(`(?i)^A03B`)
	reFanucA06B  = regexp.MustCompile(`(?i)^A06B`)
	reFanucA14B  = regexp.MustCompile(`(?i)^A14B`)
	reFanucCable = regexp.MustCompile(`(?i)^(A66[0-9A-Z]-|CAB|CABLE|CONNECTOR|CONN)`)
	// Common FANUC PCB-ish prefixes
	reFanucPCB = regexp.MustCompile(`(?i)^(A16B|A20B|A17B|A18B)`)
)

func FanucEnrich(model string) EnrichedProduct {
	model = strings.TrimSpace(model)
	upper := strings.ToUpper(model)

	partType, categorySlug := inferFanucTypeAndCategory(upper)

	name := fmt.Sprintf("FANUC %s %s", upper, partType)
	name = strings.TrimSpace(name)

	shortDesc := fmt.Sprintf("FANUC %s %s for CNC and industrial automation. Tested, ready to ship worldwide.", upper, partType)
	shortDesc = limitLen(shortDesc, 200)

	desc := buildFanucDescription(upper, partType)

	metaTitle := buildMetaTitle("FANUC", upper, partType)
	metaDesc := buildMetaDescription("FANUC", upper, partType)
	metaKeywords := buildMetaKeywords("FANUC", upper, partType)

	return EnrichedProduct{
		Name:             name,
		ShortDescription: shortDesc,
		Description:      desc,
		MetaTitle:        metaTitle,
		MetaDescription:  metaDesc,
		MetaKeywords:     metaKeywords,
		PartType:         partType,
		CategorySlug:     categorySlug,
	}
}

func inferFanucTypeAndCategory(model string) (partType string, categorySlug string) {
	if model == "" {
		return "Spare Part", "pcb-boards"
	}
	if reFanucCable.MatchString(model) {
		return "Cable / Connector", "cables-connectors"
	}
	if reFanucA03B.MatchString(model) {
		return "I/O Module", "io-modules"
	}
	if reFanucA06B.MatchString(model) {
		// In this repo, Servo Motors category is used for both motors and drives.
		return "Servo Motor / Drive", "servo-motors"
	}
	if reFanucA14B.MatchString(model) {
		return "Power Supply Unit", "power-supplies"
	}
	if reFanucA02B.MatchString(model) || reFanucPCB.MatchString(model) {
		return "PCB Board", "pcb-boards"
	}

	// Default
	return "Spare Part", "pcb-boards"
}

func buildFanucDescription(model, partType string) string {
	lines := []string{
		fmt.Sprintf("FANUC %s %s", model, partType),
		"",
		"Overview",
		fmt.Sprintf("- Brand: FANUC"),
		fmt.Sprintf("- Part No.: %s", model),
		fmt.Sprintf("- Type: %s", partType),
		"- Condition: New / Refurbished / Used (please confirm before ordering)",
		"- Warranty: 12 months",
		"- Lead time: 3-7 days",
		"- Shipping: Worldwide",
		"",
		"Compatibility",
		"- Compatibility depends on your CNC system series and option configuration.",
		"- Send us your controller model and alarm code, we will confirm before shipment.",
		"",
		"Why buy from Vcocnc",
		"- Professional industrial automation supplier since 2005",
		"- Stocked inventory and fast handling",
		"- International shipping support",
	}
	return strings.Join(lines, "\n")
}

func buildMetaTitle(brand, model, partType string) string {
	t := fmt.Sprintf("%s %s %s | In Stock | Vcocnc", brand, model, partType)
	// Keep around <= 60 chars
	if len(t) > 60 {
		t = fmt.Sprintf("%s %s %s | Vcocnc", brand, model, partType)
	}
	if len(t) > 60 {
		t = fmt.Sprintf("%s %s | Vcocnc", brand, model)
	}
	return t
}

func buildMetaDescription(brand, model, partType string) string {
	d := fmt.Sprintf("Buy %s %s %s. Tested industrial automation spare part with 12-month warranty, fast handling, and worldwide shipping. Request compatibility check before ordering.", brand, model, partType)
	return limitLen(d, 155)
}

func buildMetaKeywords(brand, model, partType string) string {
	parts := []string{
		fmt.Sprintf("%s %s", brand, model),
		model,
		partType,
		"FANUC parts",
		"FANUC spare parts",
		"CNC parts",
		"industrial automation",
		"Vcocnc",
	}
	return strings.Join(dedupeStrings(parts), ", ")
}

func dedupeStrings(in []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		key := strings.ToLower(s)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, s)
	}
	return out
}

func limitLen(s string, max int) string {
	s = strings.TrimSpace(s)
	if max <= 0 {
		return s
	}
	if len(s) <= max {
		return s
	}
	if max <= 3 {
		return s[:max]
	}
	return strings.TrimSpace(s[:max-3]) + "..."
}
