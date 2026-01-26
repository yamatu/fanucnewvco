package services

import (
	"fmt"
	"strings"
)

func EnrichProductByBrand(brand string, model string) (EnrichedProduct, error) {
	b := strings.ToLower(strings.TrimSpace(brand))
	if b == "" {
		b = "fanuc"
	}
	switch b {
	case "fanuc":
		return FanucEnrich(model), nil
	default:
		return EnrichedProduct{}, fmt.Errorf("unsupported brand: %s", brand)
	}
}
