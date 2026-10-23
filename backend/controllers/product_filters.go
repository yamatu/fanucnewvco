package controllers

import (
	"strings"

	"gorm.io/gorm"
)

// applyIndexingAndPriceFilters narrows admin product queries by search-indexing
// state (seo_noindex "true"/"false") and price state ("priced"/"inquiry").
func applyIndexingAndPriceFilters(query *gorm.DB, seoNoIndex, priceStatus string) *gorm.DB {
	switch strings.TrimSpace(seoNoIndex) {
	case "true":
		query = query.Where("seo_noindex = ?", true)
	case "false":
		query = query.Where("seo_noindex = ?", false)
	}
	switch strings.TrimSpace(priceStatus) {
	case "priced":
		query = query.Where("price > ?", 0)
	case "inquiry":
		query = query.Where("price <= ?", 0)
	}
	return query
}
