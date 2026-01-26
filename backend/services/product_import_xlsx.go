package services

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"

	"fanuc-backend/models"
	"fanuc-backend/utils"

	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ProductImportOptions struct {
	Brand         string
	Overwrite     bool
	CreateMissing bool
}

type ProductImportRow struct {
	RowNumber int
	Model     string
	Price     float64
	Quantity  int
}

type ProductImportItem struct {
	RowNumber int    `json:"row_number"`
	Model     string `json:"model"`
	Action    string `json:"action"` // created | updated | skipped | failed
	ProductID uint   `json:"product_id,omitempty"`
	SKU       string `json:"sku,omitempty"`
	Message   string `json:"message,omitempty"`
}

type ProductImportResult struct {
	Brand      string              `json:"brand"`
	TotalRows  int                 `json:"total_rows"`
	Created    int                 `json:"created"`
	Updated    int                 `json:"updated"`
	Skipped    int                 `json:"skipped"`
	Failed     int                 `json:"failed"`
	Items      []ProductImportItem `json:"items"`
	Template   string              `json:"template"` // template identifier
	Overwrite  bool                `json:"overwrite"`
	CreatedNew bool                `json:"create_missing"`
}

func GenerateProductImportTemplateXLSX(brand string) ([]byte, error) {
	brand = strings.ToLower(strings.TrimSpace(brand))
	if brand == "" {
		brand = "fanuc"
	}
	if brand != "fanuc" {
		return nil, fmt.Errorf("unsupported brand: %s", brand)
	}

	f := excelize.NewFile()
	sheet := "Products"
	f.SetSheetName("Sheet1", sheet)

	// Headers (Chinese + English helper)
	headers := []string{"型号(Model)", "价格(Price)", "数量(Quantity)"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}
	// Example row
	_ = f.SetCellValue(sheet, "A2", "A02B-0120-C041")
	_ = f.SetCellValue(sheet, "B2", 1200)
	_ = f.SetCellValue(sheet, "C2", 5)

	_ = f.SetColWidth(sheet, "A", "A", 24)
	_ = f.SetColWidth(sheet, "B", "B", 14)
	_ = f.SetColWidth(sheet, "C", "C", 14)
	_ = f.SetPanes(sheet, &excelize.Panes{Freeze: true, Split: true, YSplit: 1, ActivePane: "bottomLeft"})

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:   &excelize.Font{Bold: true, Color: "#111827"},
		Fill:   excelize.Fill{Type: "pattern", Color: []string{"#F3F4F6"}, Pattern: 1},
		Border: []excelize.Border{{Type: "bottom", Color: "#E5E7EB", Style: 1}},
	})
	_ = f.SetCellStyle(sheet, "A1", "C1", headerStyle)

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func ImportProductsFromXLSX(ctx context.Context, db *gorm.DB, r io.Reader, opts ProductImportOptions) (ProductImportResult, error) {
	if db == nil {
		return ProductImportResult{}, errors.New("db is nil")
	}
	brand := strings.ToLower(strings.TrimSpace(opts.Brand))
	if brand == "" {
		brand = "fanuc"
	}
	if brand != "fanuc" {
		return ProductImportResult{}, fmt.Errorf("unsupported brand: %s", brand)
	}
	if !opts.CreateMissing {
		// default: create missing
		opts.CreateMissing = true
	}

	fileBytes, err := io.ReadAll(r)
	if err != nil {
		return ProductImportResult{}, err
	}

	f, err := excelize.OpenReader(bytes.NewReader(fileBytes))
	if err != nil {
		return ProductImportResult{}, err
	}
	defer func() { _ = f.Close() }()

	sheet := f.GetSheetName(0)
	if sheet == "" {
		sheet = "Products"
	}

	rows, err := readImportRows(f, sheet)
	if err != nil {
		return ProductImportResult{}, err
	}

	res := ProductImportResult{
		Brand:      brand,
		TotalRows:  len(rows),
		Items:      make([]ProductImportItem, 0, len(rows)),
		Template:   "model_price_quantity_v1",
		Overwrite:  opts.Overwrite,
		CreatedNew: opts.CreateMissing,
	}

	if len(rows) == 0 {
		return res, nil
	}

	// Preload categories once (slug -> id)
	catBySlug := map[string]uint{}
	var cats []models.Category
	if e := db.Model(&models.Category{}).Where("is_active = ?", true).Find(&cats).Error; e == nil {
		for _, c := range cats {
			catBySlug[c.Slug] = c.ID
		}
	}
	defaultCategoryID := uint(0)
	if id, ok := catBySlug["pcb-boards"]; ok {
		defaultCategoryID = id
	} else if len(cats) > 0 {
		defaultCategoryID = cats[0].ID
	}

	err = db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, row := range rows {
			model := normalizeModel(row.Model)
			if model == "" {
				res.Failed++
				res.Items = append(res.Items, ProductImportItem{RowNumber: row.RowNumber, Model: row.Model, Action: "failed", Message: "model is empty"})
				continue
			}

			product, found, findErr := findProductByModelOrSKU(tx, model)
			if findErr != nil {
				res.Failed++
				res.Items = append(res.Items, ProductImportItem{RowNumber: row.RowNumber, Model: model, Action: "failed", Message: findErr.Error()})
				continue
			}

			enr, eerr := EnrichProductByBrand(brand, model)
			if eerr != nil {
				res.Failed++
				res.Items = append(res.Items, ProductImportItem{RowNumber: row.RowNumber, Model: model, Action: "failed", Message: eerr.Error()})
				continue
			}
			categoryID := defaultCategoryID
			if id, ok := catBySlug[enr.CategorySlug]; ok && id > 0 {
				categoryID = id
			}
			if categoryID == 0 {
				categoryID = defaultCategoryID
			}

			if found {
				updates := map[string]any{}
				updates["price"] = row.Price
				updates["stock_quantity"] = row.Quantity

				// Keep existing content by default; only fill missing, unless overwrite=true
				if opts.Overwrite || strings.TrimSpace(product.Name) == "" {
					updates["name"] = enr.Name
				}
				if opts.Overwrite || strings.TrimSpace(product.ShortDescription) == "" {
					updates["short_description"] = enr.ShortDescription
				}
				if opts.Overwrite || strings.TrimSpace(product.Description) == "" {
					updates["description"] = enr.Description
				}
				if opts.Overwrite || strings.TrimSpace(product.MetaTitle) == "" {
					updates["meta_title"] = enr.MetaTitle
				}
				if opts.Overwrite || strings.TrimSpace(product.MetaDescription) == "" {
					updates["meta_description"] = enr.MetaDescription
				}
				if opts.Overwrite || strings.TrimSpace(product.MetaKeywords) == "" {
					updates["meta_keywords"] = enr.MetaKeywords
				}

				if strings.TrimSpace(product.Brand) == "" {
					updates["brand"] = "FANUC"
				}
				if strings.TrimSpace(product.Model) == "" {
					updates["model"] = model
				}
				if strings.TrimSpace(product.PartNumber) == "" {
					updates["part_number"] = model
				}
				if product.CategoryID == 0 && categoryID > 0 {
					updates["category_id"] = categoryID
				}
				if opts.Overwrite && categoryID > 0 {
					updates["category_id"] = categoryID
				}

				if e := tx.Model(&models.Product{}).Where("id = ?", product.ID).Updates(updates).Error; e != nil {
					res.Failed++
					res.Items = append(res.Items, ProductImportItem{RowNumber: row.RowNumber, Model: model, Action: "failed", ProductID: product.ID, SKU: product.SKU, Message: e.Error()})
					continue
				}
				res.Updated++
				res.Items = append(res.Items, ProductImportItem{RowNumber: row.RowNumber, Model: model, Action: "updated", ProductID: product.ID, SKU: product.SKU, Message: "updated"})
				continue
			}

			if !opts.CreateMissing {
				res.Skipped++
				res.Items = append(res.Items, ProductImportItem{RowNumber: row.RowNumber, Model: model, Action: "skipped", Message: "product not found"})
				continue
			}

			// Create missing product
			baseSlug := utils.GenerateSlug(enr.Name)
			slug := utils.GenerateUniqueSlug(baseSlug, func(s string) bool {
				var count int64
				tx.Model(&models.Product{}).Where("slug = ?", s).Count(&count)
				return count > 0
			})

			p := models.Product{
				SKU:              model,
				Name:             enr.Name,
				Slug:             slug,
				ShortDescription: enr.ShortDescription,
				Description:      enr.Description,
				Price:            row.Price,
				StockQuantity:    row.Quantity,
				Brand:            "FANUC",
				Model:            model,
				PartNumber:       model,
				CategoryID:       categoryID,
				IsActive:         true,
				IsFeatured:       false,
				MetaTitle:        enr.MetaTitle,
				MetaDescription:  enr.MetaDescription,
				MetaKeywords:     enr.MetaKeywords,
				ImageURLs:        "[]",
			}

			if e := tx.Select("SKU", "Name", "Slug", "ShortDescription", "Description", "Price", "StockQuantity", "Brand", "Model", "PartNumber", "CategoryID", "IsActive", "IsFeatured", "MetaTitle", "MetaDescription", "MetaKeywords", "ImageURLs").Create(&p).Error; e != nil {
				res.Failed++
				res.Items = append(res.Items, ProductImportItem{RowNumber: row.RowNumber, Model: model, Action: "failed", Message: e.Error()})
				continue
			}

			res.Created++
			res.Items = append(res.Items, ProductImportItem{RowNumber: row.RowNumber, Model: model, Action: "created", ProductID: p.ID, SKU: p.SKU, Message: "created"})
		}
		return nil
	})
	if err != nil {
		return res, err
	}
	res.Failed = countAction(res.Items, "failed")
	return res, nil
}

func countAction(items []ProductImportItem, action string) int {
	n := 0
	for _, it := range items {
		if it.Action == action {
			n++
		}
	}
	return n
}

func normalizeModel(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	s = strings.ReplaceAll(s, "\\", "-")
	s = strings.ReplaceAll(s, "/", "-")
	s = strings.ReplaceAll(s, " ", "-")
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	s = strings.Trim(s, "-")
	s = strings.ToUpper(s)
	if strings.HasPrefix(s, "FANUC-") {
		s = strings.TrimPrefix(s, "FANUC-")
	}
	if strings.HasPrefix(s, "FANUC ") {
		s = strings.TrimSpace(strings.TrimPrefix(s, "FANUC "))
	}
	return s
}

func parseFloatCell(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}
	s = strings.ReplaceAll(s, ",", "")
	return strconv.ParseFloat(s, 64)
}

func parseIntCell(s string) (int, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}
	s = strings.ReplaceAll(s, ",", "")
	v, err := strconv.Atoi(s)
	if err != nil {
		f, ferr := strconv.ParseFloat(s, 64)
		if ferr == nil {
			return int(f), nil
		}
	}
	return v, err
}

func readImportRows(f *excelize.File, sheet string) ([]ProductImportRow, error) {
	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}

	// Detect header mapping
	header := rows[0]
	colModel := 0
	colPrice := 1
	colQty := 2
	for i, h := range header {
		key := strings.ToLower(strings.TrimSpace(h))
		key = strings.ReplaceAll(key, " ", "")
		if strings.Contains(key, "型号") || strings.Contains(key, "model") || key == "sku" {
			colModel = i
		}
		if strings.Contains(key, "价格") || strings.Contains(key, "price") {
			colPrice = i
		}
		if strings.Contains(key, "数量") || strings.Contains(key, "qty") || strings.Contains(key, "quantity") || strings.Contains(key, "stock") {
			colQty = i
		}
	}

	out := make([]ProductImportRow, 0, len(rows)-1)
	for idx := 1; idx < len(rows); idx++ {
		r := rows[idx]
		get := func(i int) string {
			if i < 0 || i >= len(r) {
				return ""
			}
			return r[i]
		}
		model := strings.TrimSpace(get(colModel))
		priceStr := get(colPrice)
		qtyStr := get(colQty)

		if model == "" && strings.TrimSpace(priceStr) == "" && strings.TrimSpace(qtyStr) == "" {
			continue
		}
		price, err := parseFloatCell(priceStr)
		if err != nil {
			return nil, fmt.Errorf("row %d: invalid price: %v", idx+1, err)
		}
		qty, err := parseIntCell(qtyStr)
		if err != nil {
			return nil, fmt.Errorf("row %d: invalid quantity: %v", idx+1, err)
		}
		out = append(out, ProductImportRow{RowNumber: idx + 1, Model: model, Price: price, Quantity: qty})
	}
	return out, nil
}

func findProductByModelOrSKU(db *gorm.DB, model string) (models.Product, bool, error) {
	var product models.Product
	if db == nil {
		return product, false, errors.New("db is nil")
	}
	normalized := strings.TrimSpace(model)
	upper := strings.ToUpper(normalized)
	candMap := map[string]bool{}
	candidates := []string{}
	add := func(s string) {
		s = strings.TrimSpace(s)
		if s == "" {
			return
		}
		if !candMap[s] {
			candMap[s] = true
			candidates = append(candidates, s)
		}
	}
	add(normalized)
	if strings.HasPrefix(upper, "FANUC-") {
		add(normalized[6:])
	}
	if strings.HasPrefix(upper, "FANUC ") {
		add(normalized[6:])
	}
	add(upper)
	add("FANUC-" + normalized)
	add("FANUC " + normalized)

	// exact SKU
	if err := db.Model(&models.Product{}).Where("sku IN ?", candidates).Order(gorm.Expr("FIELD(sku, ?) DESC, updated_at DESC", candidates)).First(&product).Error; err == nil {
		return product, true, nil
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return product, false, err
	}

	// exact model/part
	if err := db.Model(&models.Product{}).Where("model = ? OR part_number = ?", normalized, normalized).Order("updated_at DESC").First(&product).Error; err == nil {
		return product, true, nil
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return product, false, err
	}

	// prefix fallback
	like := normalized + "%"
	if err := db.Model(&models.Product{}).Where("sku LIKE ? OR model LIKE ? OR part_number LIKE ?", like, like, like).Order("updated_at DESC").First(&product).Error; err == nil {
		return product, true, nil
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return product, false, err
	}

	sanitized := strings.ReplaceAll(strings.ReplaceAll(normalized, "-", ""), "/", "")
	if err := db.Model(&models.Product{}).Where("REPLACE(REPLACE(sku,'-',''),'/','') = ?", sanitized).Order("updated_at DESC").First(&product).Error; err == nil {
		return product, true, nil
	} else if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return product, false, nil
		}
		return product, false, err
	}
	return product, false, nil
}
