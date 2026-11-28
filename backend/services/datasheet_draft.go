package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"

	"fanuc-backend/models"
)

// This file stores a Datasheets.com record as a ProductDatasheetDraft, the
// review row that the admin screen approves. The rule the whole design rests on:
// nothing reaches Product.TechnicalSpecs until a human pressed approve.

// DatasheetDraftInput describes one draft request.
type DatasheetDraftInput struct {
	// Product is nil when the lookup started from a bare part number.
	Product *models.Product
	Query   string
	Record  DatasheetRecord
	// Candidates are the parameters the administrator chose to keep.
	Candidates []DatasheetCandidate
	UserID     uint
}

// StoreDatasheetDraft persists the selected parameters as a pending draft and
// supersedes older pending drafts of the same product, so the queue never holds
// two competing proposals for one SKU.
func StoreDatasheetDraft(db *gorm.DB, in DatasheetDraftInput) (*models.ProductDatasheetDraft, error) {
	if db == nil {
		return nil, errors.New("database connection failed")
	}
	if len(in.Candidates) == 0 {
		return nil, errors.New("no parameters were selected")
	}
	model := strings.TrimSpace(in.Record.MPN)
	if model == "" {
		model = strings.TrimSpace(in.Query)
	}

	draft := &models.ProductDatasheetDraft{
		Brand:       strings.TrimSpace(in.Record.Manufacturer),
		Model:       NormalizeProductModel(model),
		Status:      "pending",
		SourceMPN:   strings.TrimSpace(in.Record.MPN),
		SourceURL:   strings.TrimSpace(in.Record.URL),
		SourceTitle: datasheetSourceTitle(in.Record),
		RequestedBy: in.UserID,
		Notes:       datasheetDraftNote(in),
	}
	if in.Product != nil {
		draft.ProductID = in.Product.ID
		draft.SKU = in.Product.SKU
		if draft.Model == "" {
			draft.Model = NormalizeProductModel(in.Product.Model)
		}
		if draft.Brand == "" {
			draft.Brand = in.Product.Brand
		}
	}

	draft.SpecsJSON = datasheetSpecsJSON(in.Candidates)
	candidatesJSON, err := json.Marshal(in.Candidates)
	if err != nil {
		return nil, err
	}
	draft.CandidatesJSON = string(candidatesJSON)

	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(draft).Error; err != nil {
			return err
		}
		supersede := tx.Model(&models.ProductDatasheetDraft{}).
			Where("id <> ? AND status = ?", draft.ID, "pending")
		if draft.ProductID > 0 {
			supersede = supersede.Where("product_id = ?", draft.ProductID)
		} else if strings.TrimSpace(draft.SKU) != "" {
			supersede = supersede.Where("product_id = 0 AND sku = ?", draft.SKU)
		} else {
			supersede = supersede.Where("product_id = 0 AND model = ?", draft.Model)
		}
		return supersede.Update("status", "superseded").Error
	})
	if err != nil {
		return nil, err
	}
	return draft, nil
}

func datasheetSourceTitle(record DatasheetRecord) string {
	title := datasheetAttribution
	if record.Manufacturer != "" || record.MPN != "" {
		title = fmt.Sprintf("%s · %s %s", datasheetAttribution, record.Manufacturer, record.MPN)
	}
	return truncateDatasheetText(strings.TrimSpace(title), 255)
}

// datasheetDraftNote records where the proposal came from, including the
// licence condition that governs republishing the values.
func datasheetDraftNote(in DatasheetDraftInput) string {
	var b strings.Builder
	b.WriteString("Imported from the Datasheets.com product search API")
	if in.Record.MPN != "" {
		b.WriteString(" (record ")
		b.WriteString(in.Record.MPN)
		if in.Record.Manufacturer != "" {
			b.WriteString(", ")
			b.WriteString(in.Record.Manufacturer)
		}
		b.WriteString(")")
	}
	b.WriteString(". ")
	if in.Record.Lifecycle != "" {
		b.WriteString("Provider lifecycle status: " + in.Record.Lifecycle + ". ")
	}
	b.WriteString("The provider terms require attribution and forbid mirroring their data, ")
	b.WriteString("so keep the link back to Datasheets.com wherever these parameters are shown.")
	return b.String()
}

// datasheetSpecsJSON builds the flat {label: value} object the draft screen
// previews, dropping duplicates so two spellings of one parameter cannot both
// survive into the table.
func datasheetSpecsJSON(candidates []DatasheetCandidate) string {
	specs := map[string]string{}
	for _, candidate := range candidates {
		label := strings.TrimSpace(candidate.Label)
		value := strings.TrimSpace(candidate.Value)
		if label == "" || value == "" {
			continue
		}
		if _, exists := specs[label]; exists {
			continue
		}
		specs[label] = value
	}
	encoded, err := json.Marshal(specs)
	if err != nil || len(specs) == 0 {
		return "{}"
	}
	return string(encoded)
}

// ApplyDatasheetDraft writes the approved parameters onto the product. Existing
// values are preserved unless overwrite is set, because silently replacing a
// hand-entered parameter is exactly the failure this queue exists to prevent.
func ApplyDatasheetDraft(db *gorm.DB, draft *models.ProductDatasheetDraft, candidates []DatasheetCandidate, overwrite bool, reviewerID uint) (int, int, string, error) {
	if db == nil || draft == nil {
		return 0, 0, "", errors.New("draft is required")
	}
	if len(candidates) == 0 {
		var stored []DatasheetCandidate
		if strings.TrimSpace(draft.CandidatesJSON) != "" {
			_ = json.Unmarshal([]byte(draft.CandidatesJSON), &stored)
		}
		candidates = stored
	}
	if len(candidates) == 0 {
		return 0, 0, "", errors.New("this draft has no parameters to apply")
	}
	// Every published value must carry the page it was copied from.
	for _, candidate := range candidates {
		if strings.TrimSpace(candidate.SourceURL) == "" {
			return 0, 0, "", fmt.Errorf("parameter %q has no cited source and cannot be published", candidate.Label)
		}
	}

	var product models.Product
	if err := db.First(&product, draft.ProductID).Error; err != nil {
		return 0, 0, "", errors.New("the product this draft belongs to no longer exists")
	}

	existing := parseDatasheetTechnicalSpecs(product.TechnicalSpecs)
	added, skipped := 0, 0
	for _, candidate := range candidates {
		label := strings.TrimSpace(candidate.Label)
		value := strings.TrimSpace(candidate.Value)
		if label == "" || value == "" {
			continue
		}
		if current, ok := existing[label]; ok && strings.TrimSpace(current) != "" && !overwrite {
			skipped++
			continue
		}
		if existing[label] == value {
			skipped++
			continue
		}
		existing[label] = value
		added++
	}
	if added == 0 {
		return 0, skipped, product.TechnicalSpecs, nil
	}

	encodedBytes, err := json.Marshal(existing)
	if err != nil {
		return 0, 0, "", err
	}
	encoded := string(encodedBytes)
	if err := db.Model(&models.Product{}).Where("id = ?", product.ID).Update("technical_specs", encoded).Error; err != nil {
		return 0, 0, "", err
	}
	return added, skipped, encoded, nil
}

// parseDatasheetTechnicalSpecs reads the JSON column back into a map. A
// malformed value yields an empty map rather than an error, because a bad
// column must never block a review action.
func parseDatasheetTechnicalSpecs(raw string) map[string]string {
	specs := map[string]string{}
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "{}" || raw == "null" {
		return specs
	}
	decoded := map[string]string{}
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil {
		loose := map[string]any{}
		if lenErr := json.Unmarshal([]byte(raw), &loose); lenErr != nil {
			return map[string]string{}
		}
		for key, value := range loose {
			decoded[key] = fmt.Sprintf("%v", value)
		}
	}
	for key, value := range decoded {
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			continue
		}
		specs[key] = value
	}
	return specs
}

// DecodeDatasheetCandidates reads the stored per-value provenance of a draft.
func DecodeDatasheetCandidates(raw string) []DatasheetCandidate {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var candidates []DatasheetCandidate
	if err := json.Unmarshal([]byte(raw), &candidates); err != nil {
		return nil
	}
	return candidates
}
