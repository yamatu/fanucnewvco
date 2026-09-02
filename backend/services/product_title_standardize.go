package services

import (
	"strings"
	"unicode/utf8"

	"fanuc-backend/models"
)

const productNameMaxRunes = 255

// ProductTitleProposal describes one product rename toward the canonical
// "Brand Model Type" storefront naming (e.g. "FANUC A06B-6114-H105 Servo
// Amplifier"). Status is "ready" when the rename is safe, "skipped" when the
// name already matches, and "unresolved" when brand or product type could not
// be verified from the model number rules.
type ProductTitleProposal struct {
	ProductID uint   `json:"product_id"`
	SKU       string `json:"sku"`
	Status    string `json:"status"`
	Message   string `json:"message,omitempty"`
	Brand     string `json:"brand,omitempty"`
	Model     string `json:"model,omitempty"`
	PartType  string `json:"part_type,omitempty"`
	OldName   string `json:"old_name"`
	NewName   string `json:"new_name,omitempty"`
}

// ProposeStandardProductTitle derives the canonical name from the same
// verified classification rules used for category optimization. It never
// invents a brand or type: unverifiable products are reported as unresolved
// so the administrator can fix the source data instead of shipping a wrong
// title.
func ProposeStandardProductTitle(product models.Product) ProductTitleProposal {
	proposal := ProductTitleProposal{
		ProductID: product.ID,
		SKU:       product.SKU,
		OldName:   product.Name,
		Status:    "unresolved",
	}

	model := productClassificationModel(product)
	proposal.Model = model
	if model == "" {
		proposal.Message = "no usable model or part number"
		return proposal
	}

	inference := InferProductCategory(strings.TrimSpace(product.Brand), model)
	if !IsConfirmedProductCategory(inference, model) {
		if nameInference, ok := inferAdminNameCategory(strings.TrimSpace(product.Brand), model, product.Name); ok {
			inference = nameInference
		}
	}
	if !IsConfirmedProductCategory(inference, model) {
		proposal.Message = ClassificationFailureReason(inference, model)
		return proposal
	}

	brand := strings.TrimSpace(inference.BrandName)
	if brand == "" {
		brand = CanonicalBrandName(inference.BrandKey)
	}
	partType := canonicalCategoryTypeName(inference.PartType)
	if brand == "" || partType == "" || strings.EqualFold(partType, "Spare Part") {
		proposal.Message = "verified brand and specific product type are required"
		return proposal
	}
	proposal.Brand = brand
	proposal.PartType = partType

	newName := composeStandardProductTitle(brand, model, partType)
	proposal.NewName = newName
	if strings.EqualFold(strings.TrimSpace(product.Name), newName) {
		proposal.Status = "skipped"
		proposal.Message = "name already standardized"
		return proposal
	}
	proposal.Status = "ready"
	return proposal
}

// composeStandardProductTitle joins brand, model, and type without repeating a
// brand token that already leads the model string, and keeps the result within
// the database column limit.
func composeStandardProductTitle(brand, model, partType string) string {
	segments := make([]string, 0, 3)
	if brand != "" && !strings.HasPrefix(taxonomyNormalize(model), taxonomyNormalize(brand)) {
		segments = append(segments, brand)
	}
	segments = append(segments, model)
	if partType != "" && !strings.Contains(taxonomyNormalize(model), taxonomyNormalize(partType)) {
		segments = append(segments, partType)
	}
	name := strings.Join(segments, " ")
	name = strings.Join(strings.Fields(name), " ")
	for utf8.RuneCountInString(name) > productNameMaxRunes {
		runes := []rune(name)
		name = strings.TrimSpace(string(runes[:productNameMaxRunes]))
	}
	return name
}
