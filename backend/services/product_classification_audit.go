package services

import (
	"errors"
	"strings"

	"fanuc-backend/models"
	"gorm.io/gorm"
)

// Classification audit issues, ordered from most to least severe. A product
// receives exactly one issue; "ok" products are counted but never listed.
const (
	AuditIssueUncategorized      = "uncategorized"
	AuditIssueWrongCategory      = "wrong_category"
	AuditIssueRootCategory       = "root_category"
	AuditIssueGenericCategory    = "generic_category"
	AuditIssueInactiveUnresolved = "inactive_unresolved"
	AuditIssueSEOFailed          = "seo_failed"
)

type ProductClassificationIssue struct {
	ProductID    uint   `json:"product_id"`
	SKU          string `json:"sku"`
	Name         string `json:"name"`
	Brand        string `json:"brand"`
	Model        string `json:"model"`
	CategoryID   uint   `json:"category_id"`
	CategoryPath string `json:"category_path"`
	Issue        string `json:"issue"`
	Detail       string `json:"detail"`
}

type ProductClassificationAuditResult struct {
	Scanned            int    `json:"scanned"`
	OK                 int    `json:"ok"`
	Uncategorized      int    `json:"uncategorized"`
	WrongCategory      int    `json:"wrong_category"`
	RootCategory       int    `json:"root_category"`
	GenericCategory    int    `json:"generic_category"`
	InactiveUnresolved int    `json:"inactive_unresolved"`
	SEOFailed          int    `json:"seo_failed"`
	ProductIDs         []uint `json:"product_ids"`
	// Samples is a bounded illustrative list for the admin UI; ProductIDs is
	// the complete rework selection.
	Samples []ProductClassificationIssue `json:"samples"`
}

const auditSampleLimit = 100

type auditCategoryInfo struct {
	Path     string
	RootName string
	IsRoot   bool
	Exists   bool
}

// genericAuditRootNames flags catch-all trees such as "Industrial Automation
// Spare Parts" or "Unidentified Spare Parts". Only the ROOT segment is
// checked, so legitimate family nodes like "Siemens > S7-1500 Spare Parts"
// are never swept into a rework.
func isGenericAuditRootName(name string) bool {
	name = strings.ToLower(strings.TrimSpace(name))
	if name == "" {
		return false
	}
	for _, marker := range []string{"industrial automation", "unidentified", "uncategorized", "spare part", "new arrival", "misc"} {
		if strings.Contains(name, marker) {
			return true
		}
	}
	return name == "other" || name == "others"
}

func buildAuditCategoryIndex(categories []models.Category) map[uint]auditCategoryInfo {
	byID := make(map[uint]models.Category, len(categories))
	for _, category := range categories {
		byID[category.ID] = category
	}
	index := make(map[uint]auditCategoryInfo, len(categories))
	for _, category := range categories {
		segments := []string{}
		current := category
		for depth := 0; depth < 12; depth++ {
			segments = append([]string{current.Name}, segments...)
			if current.ParentID == nil {
				break
			}
			parent, ok := byID[*current.ParentID]
			if !ok {
				break
			}
			current = parent
		}
		index[category.ID] = auditCategoryInfo{
			Path:     strings.Join(segments, " > "),
			RootName: segments[0],
			IsRoot:   category.ParentID == nil,
			Exists:   true,
		}
	}
	return index
}

// evaluateProductClassification decides whether one product needs rework. It
// is deliberately conservative for active products whose model rules are
// unknown: without verified evidence there is no better category to move them
// to, so only clearly broken placements are flagged.
func evaluateProductClassification(product models.Product, categoryIndex map[uint]auditCategoryInfo) (string, string) {
	category := categoryIndex[product.CategoryID]
	if product.CategoryID == 0 || !category.Exists {
		return AuditIssueUncategorized, "product has no existing category"
	}

	model := productClassificationModel(product)
	inference := InferProductCategory(strings.TrimSpace(product.Brand), model)
	if !IsConfirmedProductCategory(inference, model) {
		if nameInference, ok := inferAdminNameCategory(strings.TrimSpace(product.Brand), model, product.Name); ok {
			inference = nameInference
		}
	}

	if IsConfirmedProductCategory(inference, model) {
		if CategoryPathMatchScore(category.Path, inference) == 0 {
			return AuditIssueWrongCategory, "verified as " + inference.BrandName + " " + inference.PartType + " but placed under " + category.Path
		}
		return "", ""
	}

	if !product.IsActive {
		return AuditIssueInactiveUnresolved, ClassificationFailureReason(inference, model)
	}
	if strings.EqualFold(strings.TrimSpace(product.AISEOStatus), "failed") {
		return AuditIssueSEOFailed, "AI SEO run failed and the classification is unverified"
	}
	if category.IsRoot {
		return AuditIssueRootCategory, "unverified product sits directly under root category " + category.Path
	}
	if isGenericAuditRootName(category.RootName) {
		return AuditIssueGenericCategory, "unverified product sits in catch-all tree " + category.Path
	}
	return "", ""
}

// AuditProductClassifications scans the whole catalog and returns every
// product that should be re-run through category optimization. Products
// already queued in an active job are skipped so a rework job can always be
// created from the result.
func AuditProductClassifications(db *gorm.DB, maxProducts int) (*ProductClassificationAuditResult, error) {
	if db == nil {
		return nil, errors.New("database is nil")
	}
	if maxProducts <= 0 || maxProducts > 30000 {
		maxProducts = 30000
	}

	var categories []models.Category
	if err := db.Order("id ASC").Find(&categories).Error; err != nil {
		return nil, err
	}
	categoryIndex := buildAuditCategoryIndex(categories)

	pending := map[uint]bool{}
	var pendingIDs []uint
	if err := db.Model(&models.AIAgentSEOJobItem{}).
		Where("status IN ?", []string{"queued", "running"}).
		Pluck("product_id", &pendingIDs).Error; err != nil {
		return nil, err
	}
	for _, id := range pendingIDs {
		pending[id] = true
	}

	result := &ProductClassificationAuditResult{ProductIDs: []uint{}, Samples: []ProductClassificationIssue{}}
	afterID := uint(0)
	for {
		var products []models.Product
		if err := db.Model(&models.Product{}).
			Select("id", "sku", "name", "brand", "model", "part_number", "category_id", "is_active", "ai_seo_status").
			Where("id > ?", afterID).
			Order("id ASC").
			Limit(1000).
			Find(&products).Error; err != nil {
			return nil, err
		}
		if len(products) == 0 {
			break
		}
		for _, product := range products {
			afterID = product.ID
			result.Scanned++
			issue, detail := evaluateProductClassification(product, categoryIndex)
			if issue == "" {
				result.OK++
				continue
			}
			switch issue {
			case AuditIssueUncategorized:
				result.Uncategorized++
			case AuditIssueWrongCategory:
				result.WrongCategory++
			case AuditIssueRootCategory:
				result.RootCategory++
			case AuditIssueGenericCategory:
				result.GenericCategory++
			case AuditIssueInactiveUnresolved:
				result.InactiveUnresolved++
			case AuditIssueSEOFailed:
				result.SEOFailed++
			}
			if len(result.Samples) < auditSampleLimit {
				result.Samples = append(result.Samples, ProductClassificationIssue{
					ProductID:    product.ID,
					SKU:          product.SKU,
					Name:         product.Name,
					Brand:        product.Brand,
					Model:        productClassificationModel(product),
					CategoryID:   product.CategoryID,
					CategoryPath: categoryIndex[product.CategoryID].Path,
					Issue:        issue,
					Detail:       detail,
				})
			}
			if !pending[product.ID] && len(result.ProductIDs) < maxProducts {
				result.ProductIDs = append(result.ProductIDs, product.ID)
			}
		}
	}
	return result, nil
}
