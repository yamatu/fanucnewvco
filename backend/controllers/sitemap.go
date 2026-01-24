package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
)

// SitemapController provides dynamic sitemap endpoints similar to xmlsitemap.php
type SitemapController struct{}

func getBaseURL() string {
	if v := os.Getenv("SITE_URL"); v != "" {
		return v
	}
	// Fallback to production domain
	return "https://www.vcocncspare.com"
}

// GetXMLSitemap handles /xmlsitemap.php with enhanced SEO structure similar to fanucworld.com
// Examples:
//
//	/xmlsitemap.php                      -> comprehensive sitemapindex with timestamped entries
//	/xmlsitemap.php?type=pages&page=1    -> static pages with enhanced SEO metadata
//	/xmlsitemap.php?type=products&page=1 -> paginated product URLs with proper prioritization
//	/xmlsitemap.php?type=categories&page=1 -> categories with SEO-friendly URLs
//	/xmlsitemap.php?type=brand&page=1    -> brand-based product groupings
func (sc *SitemapController) GetXMLSitemap(c *gin.Context) {
	c.Header("Content-Type", "application/xml; charset=utf-8")
	c.Header("Cache-Control", "public, max-age=3600, s-maxage=3600")
	c.Header("X-Robots-Tag", "noindex")

	baseURL := getBaseURL()
	typeParam := c.Query("type")
	pageStr := c.DefaultQuery("page", "1")
	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}

	if typeParam == "" { // Enhanced sitemap index with proper timestamps
		pageSize := 250 // Optimized page size for better crawl efficiency
		var count int64
		db := config.GetDB()
		if db == nil {
			c.String(http.StatusInternalServerError, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" />")
			return
		}

		// Get product count and latest update timestamp
		var latestUpdate time.Time
		if err := db.Model(&models.Product{}).Where("is_active = ?", true).Count(&count).Error; err != nil {
			count = 0
		}
		db.Model(&models.Product{}).Where("is_active = ?", true).Select("MAX(updated_at)").Row().Scan(&latestUpdate)

		pages := int((count + int64(pageSize) - 1) / int64(pageSize))
		if pages < 1 {
			pages = 1
		}

		xml := "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
		xml += "<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"

		// Static pages
		xml += fmt.Sprintf("  <sitemap>\n    <loc>%s/xmlsitemap.php?type=pages&amp;page=1</loc>\n    <lastmod>%s</lastmod>\n  </sitemap>\n",
			baseURL, time.Now().UTC().Format(time.RFC3339))

		// Categories sitemap
		xml += fmt.Sprintf("  <sitemap>\n    <loc>%s/xmlsitemap.php?type=categories&amp;page=1</loc>\n    <lastmod>%s</lastmod>\n  </sitemap>\n",
			baseURL, time.Now().UTC().Format(time.RFC3339))

		// Product pages with timestamps
		for p := 1; p <= pages; p++ {
			lastmod := latestUpdate
			if lastmod.IsZero() {
				lastmod = time.Now()
			}
			xml += fmt.Sprintf("  <sitemap>\n    <loc>%s/xmlsitemap.php?type=products&amp;page=%d</loc>\n    <lastmod>%s</lastmod>\n  </sitemap>\n",
				baseURL, p, lastmod.UTC().Format(time.RFC3339))
		}

		// Brand-based groupings for better categorization
		xml += fmt.Sprintf("  <sitemap>\n    <loc>%s/xmlsitemap.php?type=brand&amp;page=1</loc>\n    <lastmod>%s</lastmod>\n  </sitemap>\n",
			baseURL, time.Now().UTC().Format(time.RFC3339))

		xml += "</sitemapindex>"
		c.String(http.StatusOK, xml)
		return
	}

	switch typeParam {
	case "pages":
		pages := []struct {
			Loc        string
			Changefreq string
			Priority   string
			Lastmod    string
		}{
			{Loc: fmt.Sprintf("%s/", baseURL), Changefreq: "daily", Priority: "1.0", Lastmod: time.Now().UTC().Format(time.RFC3339)},
			{Loc: fmt.Sprintf("%s/products", baseURL), Changefreq: "hourly", Priority: "0.9", Lastmod: time.Now().UTC().Format(time.RFC3339)},
			{Loc: fmt.Sprintf("%s/about", baseURL), Changefreq: "monthly", Priority: "0.8", Lastmod: time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)},
			{Loc: fmt.Sprintf("%s/contact", baseURL), Changefreq: "monthly", Priority: "0.8", Lastmod: time.Now().AddDate(0, 0, -7).UTC().Format(time.RFC3339)},
			{Loc: fmt.Sprintf("%s/faq", baseURL), Changefreq: "monthly", Priority: "0.7", Lastmod: time.Now().AddDate(0, 0, -14).UTC().Format(time.RFC3339)},
			{Loc: fmt.Sprintf("%s/warranty", baseURL), Changefreq: "monthly", Priority: "0.6", Lastmod: time.Now().AddDate(0, 0, -30).UTC().Format(time.RFC3339)},
			{Loc: fmt.Sprintf("%s/returns", baseURL), Changefreq: "monthly", Priority: "0.6", Lastmod: time.Now().AddDate(0, 0, -30).UTC().Format(time.RFC3339)},
			{Loc: fmt.Sprintf("%s/privacy", baseURL), Changefreq: "yearly", Priority: "0.4", Lastmod: time.Now().AddDate(0, -6, 0).UTC().Format(time.RFC3339)},
			{Loc: fmt.Sprintf("%s/terms", baseURL), Changefreq: "yearly", Priority: "0.4", Lastmod: time.Now().AddDate(0, -6, 0).UTC().Format(time.RFC3339)},
		}
		xml := "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
		xml += "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
		for _, p := range pages {
			xml += fmt.Sprintf("  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>\n",
				p.Loc, p.Lastmod, p.Changefreq, p.Priority)
		}
		xml += "</urlset>"
		c.String(http.StatusOK, xml)
		return

	case "products":
		pageSize := 250 // Optimized page size for better crawl efficiency
		offset := (page - 1) * pageSize
		db := config.GetDB()
		var products []models.Product
		if err := db.Where("is_active = ?", true).Order("updated_at DESC, created_at DESC").Limit(pageSize).Offset(offset).Find(&products).Error; err != nil {
			c.String(http.StatusOK, emptyURLSet())
			return
		}
		xml := "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
		xml += "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
		for _, p := range products {
			lastmod := ""
			if !p.UpdatedAt.IsZero() {
				lastmod = fmt.Sprintf("    <lastmod>%s</lastmod>\n", p.UpdatedAt.UTC().Format(time.RFC3339))
			}

			// Enhanced priority based on stock status and recency
			priority := "0.6"
			if p.StockQuantity > 0 {
				priority = "0.8" // In stock items get higher priority
			}
			if time.Since(p.CreatedAt) < 30*24*time.Hour {
				priority = "0.9" // New products get highest priority
			}

			// Create SEO-friendly URL with slug
			slug := p.Slug
			if slug == "" {
				// Generate slug from product name if not available
				slug = strings.ToLower(strings.ReplaceAll(p.Name, " ", "-"))
				slug = strings.ReplaceAll(slug, "/", "-")
				slug = strings.ReplaceAll(slug, "\\", "-")
			}

			loc := fmt.Sprintf("%s/products/%s-%s", baseURL, p.SKU, slug)
			xml += fmt.Sprintf("  <url>\n    <loc>%s</loc>\n%s    <changefreq>weekly</changefreq>\n    <priority>%s</priority>\n  </url>\n",
				loc, lastmod, priority)
		}
		xml += "</urlset>"
		c.String(http.StatusOK, xml)
		return

	case "categories":
		db := config.GetDB()
		var categories []models.Category
		if err := db.Where("is_active = ?", true).Order("updated_at DESC").Find(&categories).Error; err != nil {
			c.String(http.StatusOK, emptyURLSet())
			return
		}
		// Compute nested paths
		tree := services.BuildCategoryTree(categories)
		flat := services.FlattenCategoryTree(tree)
		xml := "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
		xml += "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
		for _, cat := range flat {
			lastmod := ""
			if !cat.UpdatedAt.IsZero() {
				lastmod = fmt.Sprintf("    <lastmod>%s</lastmod>\n", cat.UpdatedAt.UTC().Format(time.RFC3339))
			}
			if strings.TrimSpace(cat.Path) == "" {
				continue
			}
			loc := fmt.Sprintf("%s/categories/%s", strings.TrimRight(baseURL, "/"), cat.Path)
			xml += fmt.Sprintf("  <url>\n    <loc>%s</loc>\n%s    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n",
				loc, lastmod)
		}
		xml += "</urlset>"
		c.String(http.StatusOK, xml)
		return

	case "brand":
		db := config.GetDB()
		// Get distinct brands from products
		var brands []string
		if err := db.Model(&models.Product{}).Where("is_active = ? AND brand != ''", true).Distinct("brand").Pluck("brand", &brands).Error; err != nil {
			c.String(http.StatusOK, emptyURLSet())
			return
		}
		xml := "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
		xml += "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
		for _, brand := range brands {
			if brand == "" {
				continue
			}
			// Create brand-specific product listing pages
			loc := fmt.Sprintf("%s/products?brand=%s", baseURL, brand)
			xml += fmt.Sprintf("  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n",
				loc, time.Now().UTC().Format(time.RFC3339))
		}
		xml += "</urlset>"
		c.String(http.StatusOK, xml)
		return
	}

	c.String(http.StatusOK, emptyURLSet())
}

func emptyURLSet() string {
	xml := "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
	xml += "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" />"
	return xml
}
