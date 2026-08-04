package services

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"fanuc-backend/models"
	"fanuc-backend/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const productQuoteCSVTemplate = "brand_model_price_lead_time_csv_v1"

var quotePriceNumberPattern = regexp.MustCompile(`[-+]?\d+(?:\.\d+)?`)

type ProductQuoteCSVRow struct {
	RowNumber int
	Brand     string
	Model     string
	Price     float64
	HasPrice  bool
	LeadTime  string
}

type quoteCSVHeaderMap struct {
	Brand    int
	Model    int
	Price    int
	LeadTime int
}

// StartProductQuoteCSVImportTask stores the upload and processes it outside the request lifecycle.
func StartProductQuoteCSVImportTask(ctx context.Context, db *gorm.DB, src io.Reader, filename string) (ProductImportTaskSnapshot, error) {
	if db == nil {
		return ProductImportTaskSnapshot{}, errors.New("db is nil")
	}

	tempDir := filepath.Join(os.TempDir(), productImportTempDirName)
	if err := os.MkdirAll(tempDir, 0o755); err != nil {
		return ProductImportTaskSnapshot{}, err
	}

	taskID := uuid.NewString()
	tmpFile, err := os.CreateTemp(tempDir, fmt.Sprintf("%s-*.csv", taskID))
	if err != nil {
		return ProductImportTaskSnapshot{}, err
	}

	cleanupOnError := true
	defer func() {
		if cleanupOnError {
			_ = tmpFile.Close()
			_ = os.Remove(tmpFile.Name())
		}
	}()
	if _, err := io.Copy(tmpFile, src); err != nil {
		return ProductImportTaskSnapshot{}, err
	}
	if err := tmpFile.Close(); err != nil {
		return ProductImportTaskSnapshot{}, err
	}

	now := time.Now()
	task := &productImportTask{
		ID:       taskID,
		Status:   ProductImportTaskQueued,
		Filename: filename,
		FilePath: tmpFile.Name(),
		Result: ProductImportResult{
			Items:      make([]ProductImportItem, 0, productImportRecentItems),
			Template:   productQuoteCSVTemplate,
			CreatedNew: true,
		},
		Message:   "queued",
		CreatedAt: now,
		UpdatedAt: now,
	}
	productImportTasks.add(task)
	cleanupOnError = false

	go runProductQuoteCSVImportTask(detachContext(ctx), db, taskID)
	return task.snapshot(), nil
}

func runProductQuoteCSVImportTask(ctx context.Context, db *gorm.DB, taskID string) {
	task, ok := productImportTasks.get(taskID)
	if !ok {
		return
	}
	now := time.Now()
	task.update(func(t *productImportTask) {
		t.Status = ProductImportTaskProcessing
		t.Message = "reading CSV"
		t.StartedAt = &now
		t.UpdatedAt = now
	})

	file, err := os.Open(task.FilePath)
	if err == nil {
		defer file.Close()
	}
	var result ProductImportResult
	if err == nil {
		result, err = ImportProductsFromQuoteCSV(ctx, db, file, task)
	}

	finishedAt := time.Now()
	if err != nil {
		task.update(func(t *productImportTask) {
			t.Status = ProductImportTaskFailed
			t.Message = err.Error()
			t.Error = err.Error()
			t.CompletedAt = &finishedAt
			t.UpdatedAt = finishedAt
		})
	} else {
		task.update(func(t *productImportTask) {
			t.Status = ProductImportTaskCompleted
			t.ProgressPct = 100
			t.ProcessedRows = result.TotalRows
			t.TotalRows = result.TotalRows
			t.Result = result
			t.Message = "completed"
			t.CompletedAt = &finishedAt
			t.UpdatedAt = finishedAt
		})
		if result.Created > 0 || result.Updated > 0 {
			InvalidatePublicCaches(context.Background(), "product:import:quotes-csv", nil)
			TriggerNextRevalidate(nil, nil, true)
		}
	}
	_ = os.Remove(task.FilePath)
}

// ImportProductsFromQuoteCSV imports four-column quote exports: brand, model, price, lead time.
// Blank-price rows create quote-only products but never erase a price already stored on the site.
func ImportProductsFromQuoteCSV(ctx context.Context, db *gorm.DB, r io.Reader, task *productImportTask) (ProductImportResult, error) {
	if db == nil {
		return ProductImportResult{}, errors.New("db is nil")
	}
	rows, duplicateItems, sourceRows, err := readProductQuoteCSV(r)
	if err != nil {
		return ProductImportResult{}, err
	}

	result := ProductImportResult{
		TotalRows:  sourceRows,
		Items:      make([]ProductImportItem, 0, minInt(sourceRows, productImportRecentItems)),
		Template:   productQuoteCSVTemplate,
		CreatedNew: true,
	}
	for _, item := range duplicateItems {
		appendImportItem(&result, item)
	}
	updateTaskProgress(task, result, len(duplicateItems), sourceRows, "CSV validated")
	if len(rows) == 0 {
		return result, nil
	}

	catalogs := map[string]*importCategoryCatalog{}
	for offset := 0; offset < len(rows); offset += productImportBatchSize {
		if err := ctx.Err(); err != nil {
			return result, err
		}
		end := offset + productImportBatchSize
		if end > len(rows) {
			end = len(rows)
		}
		if err := applyProductQuoteCSVBatch(ctx, db, rows[offset:end], catalogs, &result); err != nil {
			return result, err
		}
		processed := len(duplicateItems) + end
		updateTaskProgress(task, result, processed, sourceRows, fmt.Sprintf("processed %d/%d", processed, sourceRows))
	}
	return result, nil
}

func readProductQuoteCSV(r io.Reader) ([]ProductQuoteCSVRow, []ProductImportItem, int, error) {
	reader := csv.NewReader(r)
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true
	reader.ReuseRecord = false

	header, err := reader.Read()
	if err != nil {
		if errors.Is(err, io.EOF) {
			return nil, nil, 0, errors.New("CSV is empty")
		}
		return nil, nil, 0, fmt.Errorf("read CSV header: %w", err)
	}
	if len(header) > 0 {
		header[0] = strings.TrimPrefix(header[0], "\ufeff")
	}
	headerMap, err := detectQuoteCSVHeader(header)
	if err != nil {
		return nil, nil, 0, err
	}

	rows := make([]ProductQuoteCSVRow, 0, 1024)
	indexBySKU := make(map[string]int, 1024)
	duplicates := make([]ProductImportItem, 0)
	sourceRows := 0
	rowNumber := 1
	for {
		record, readErr := reader.Read()
		if errors.Is(readErr, io.EOF) {
			break
		}
		rowNumber++
		if readErr != nil {
			return nil, nil, sourceRows, fmt.Errorf("row %d: invalid CSV: %w", rowNumber, readErr)
		}

		rawModel := strings.TrimSpace(getCol(record, headerMap.Model))
		rawBrand := strings.TrimSpace(getCol(record, headerMap.Brand))
		rawPrice := strings.TrimSpace(getCol(record, headerMap.Price))
		leadTime := strings.TrimSpace(getCol(record, headerMap.LeadTime))
		if rawModel == "" && rawBrand == "" && rawPrice == "" && leadTime == "" {
			continue
		}
		sourceRows++
		model := NormalizeProductModel(rawModel)
		if model == "" {
			duplicates = append(duplicates, ProductImportItem{RowNumber: rowNumber, Action: "failed", Message: "model is empty"})
			continue
		}
		price, hasPrice, parseErr := parseQuoteCSVPrice(rawPrice)
		if parseErr != nil {
			duplicates = append(duplicates, ProductImportItem{RowNumber: rowNumber, Model: model, Action: "failed", Message: parseErr.Error()})
			continue
		}
		row := ProductQuoteCSVRow{
			RowNumber: rowNumber,
			Brand:     CanonicalBrandName(rawBrand),
			Model:     model,
			Price:     price,
			HasPrice:  hasPrice,
			LeadTime:  leadTime,
		}
		key := strings.ToUpper(model)
		if existingIndex, exists := indexBySKU[key]; exists {
			existing := &rows[existingIndex]
			if row.Brand != "" {
				existing.Brand = row.Brand
			}
			if row.HasPrice {
				existing.Price = row.Price
				existing.HasPrice = true
			}
			if row.LeadTime != "" {
				existing.LeadTime = row.LeadTime
			}
			duplicates = append(duplicates, ProductImportItem{RowNumber: rowNumber, Model: model, SKU: model, Action: "skipped", Message: fmt.Sprintf("duplicate row merged with row %d", existing.RowNumber)})
			continue
		}
		indexBySKU[key] = len(rows)
		rows = append(rows, row)
	}
	return rows, duplicates, sourceRows, nil
}

func detectQuoteCSVHeader(header []string) (quoteCSVHeaderMap, error) {
	mapping := quoteCSVHeaderMap{Brand: -1, Model: -1, Price: -1, LeadTime: -1}
	for index, value := range header {
		key := strings.ToLower(strings.TrimSpace(strings.TrimPrefix(value, "\ufeff")))
		key = strings.NewReplacer(" ", "", "_", "", "-", "", "（", "", "）", "", "(", "", ")", "").Replace(key)
		switch {
		case key == "品牌" || key == "brand" || key == "manufacturer":
			mapping.Brand = index
		case key == "型号" || key == "model" || key == "sku" || key == "code" || key == "partnumber" || key == "料号":
			mapping.Model = index
		case key == "价格" || key == "price" || key == "unitprice":
			mapping.Price = index
		case key == "交期" || key == "leadtime" || key == "delivery" || key == "deliverytime":
			mapping.LeadTime = index
		}
	}
	if mapping.Model < 0 {
		return mapping, errors.New("CSV must contain a 型号/Model/SKU column")
	}
	return mapping, nil
}

func parseQuoteCSVPrice(raw string) (float64, bool, error) {
	value := strings.TrimSpace(raw)
	indicator := strings.ToLower(strings.TrimSpace(value))
	if value == "" || strings.EqualFold(value, "n/a") || value == "-" ||
		strings.Contains(indicator, "quote") || strings.Contains(indicator, "contact") ||
		strings.Contains(value, "询价") || strings.Contains(value, "待报价") {
		return 0, false, nil
	}
	value = strings.ReplaceAll(value, ",", "")
	match := quotePriceNumberPattern.FindString(value)
	if match == "" {
		return 0, false, fmt.Errorf("invalid price %q", raw)
	}
	price, err := strconv.ParseFloat(match, 64)
	if err != nil || price < 0 {
		return 0, false, fmt.Errorf("invalid price %q", raw)
	}
	if price == 0 {
		return 0, false, nil
	}
	return price, true, nil
}

func applyProductQuoteCSVBatch(ctx context.Context, db *gorm.DB, rows []ProductQuoteCSVRow, catalogs map[string]*importCategoryCatalog, result *ProductImportResult) error {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, row := range rows {
			product, found, findErr := findProductByModelOrSKU(tx, row.Model)
			if findErr != nil {
				appendImportItem(result, ProductImportItem{RowNumber: row.RowNumber, Model: row.Model, Action: "failed", Message: findErr.Error()})
				continue
			}
			if found {
				updates := map[string]any{}
				if row.HasPrice {
					updates["price"] = row.Price
				}
				if row.LeadTime != "" {
					updates["lead_time"] = row.LeadTime
				}
				if row.Brand != "" && strings.TrimSpace(product.Brand) == "" {
					updates["brand"] = row.Brand
				}
				if strings.TrimSpace(product.Model) == "" {
					updates["model"] = row.Model
				}
				if strings.TrimSpace(product.PartNumber) == "" {
					updates["part_number"] = row.Model
				}
				if len(updates) == 0 {
					appendImportItem(result, ProductImportItem{RowNumber: row.RowNumber, Model: row.Model, Action: "skipped", ProductID: product.ID, SKU: product.SKU, Message: "product already exists; no non-empty values to update"})
					continue
				}
				if err := tx.Model(&models.Product{}).Where("id = ?", product.ID).Updates(updates).Error; err != nil {
					appendImportItem(result, ProductImportItem{RowNumber: row.RowNumber, Model: row.Model, Action: "failed", ProductID: product.ID, SKU: product.SKU, Message: err.Error()})
					continue
				}
				appendImportItem(result, ProductImportItem{RowNumber: row.RowNumber, Model: row.Model, Action: "updated", ProductID: product.ID, SKU: product.SKU, Message: "existing product updated"})
				continue
			}

			brandKey := NormalizeBrandKey(row.Brand)
			catalog, ok := catalogs[brandKey]
			if !ok {
				catalog = loadImportCategories(tx, brandKey)
				catalogs[brandKey] = catalog
			}
			enriched, enrichErr := EnrichProductByBrand(brandKey, row.Model)
			if enrichErr != nil {
				appendImportItem(result, ProductImportItem{RowNumber: row.RowNumber, Model: row.Model, Action: "failed", Message: enrichErr.Error()})
				continue
			}
			categoryID := catalog.DefaultCategoryID
			if id := catalog.ActiveBySlug[enriched.CategorySlug]; id > 0 {
				categoryID = id
			}
			if categoryID == 0 {
				appendImportItem(result, ProductImportItem{RowNumber: row.RowNumber, Model: row.Model, Action: "failed", Message: "no product category is available"})
				continue
			}

			name := strings.TrimSpace(enriched.Name)
			if name == "" {
				name = strings.TrimSpace(strings.Join([]string{row.Brand, row.Model}, " "))
			}
			baseSlug := utils.GenerateSlug(name)
			if baseSlug == "" {
				baseSlug = utils.GenerateSlug(row.Model)
			}
			slug := utils.GenerateUniqueSlug(baseSlug, func(candidate string) bool {
				var count int64
				tx.Model(&models.Product{}).Where("slug = ?", candidate).Count(&count)
				return count > 0
			})
			product = models.Product{
				SKU:              row.Model,
				Name:             name,
				Slug:             slug,
				ShortDescription: enriched.ShortDescription,
				Description:      enriched.Description,
				Price:            row.Price,
				Brand:            row.Brand,
				Model:            row.Model,
				PartNumber:       row.Model,
				CategoryID:       categoryID,
				LeadTime:         row.LeadTime,
				IsActive:         true,
				MetaTitle:        enriched.MetaTitle,
				MetaDescription:  enriched.MetaDescription,
				MetaKeywords:     enriched.MetaKeywords,
				ImageURLs:        "[]",
			}
			if err := tx.Create(&product).Error; err != nil {
				appendImportItem(result, ProductImportItem{RowNumber: row.RowNumber, Model: row.Model, Action: "failed", Message: err.Error()})
				continue
			}
			message := "quote-only product created"
			if row.HasPrice {
				message = "priced product created"
			}
			appendImportItem(result, ProductImportItem{RowNumber: row.RowNumber, Model: row.Model, Action: "created", ProductID: product.ID, SKU: product.SKU, Message: message})
		}
		return nil
	})
}
