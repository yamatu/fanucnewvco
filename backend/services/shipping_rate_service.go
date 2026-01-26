package services

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"

	"fanuc-backend/models"

	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ShippingRatePublic struct {
	CountryCode string  `json:"country_code"`
	CountryName string  `json:"country_name"`
	Fee         float64 `json:"fee"`
	Currency    string  `json:"currency"`
}

func NormalizeCountryCode(code string) string {
	c := strings.ToUpper(strings.TrimSpace(code))
	if len(c) > 2 {
		c = c[:2]
	}
	return c
}

func GetShippingFee(db *gorm.DB, countryCode string) (fee float64, currency string, err error) {
	if db == nil {
		return 0, "", errors.New("db is nil")
	}
	cc := NormalizeCountryCode(countryCode)
	if cc == "" {
		return 0, "", errors.New("country_code is empty")
	}
	var r models.ShippingRate
	if err := db.Where("country_code = ? AND is_active = ?", cc, true).First(&r).Error; err != nil {
		return 0, "", err
	}
	if strings.TrimSpace(r.Currency) == "" {
		r.Currency = "USD"
	}
	return r.Fee, r.Currency, nil
}

func ListActiveShippingRates(db *gorm.DB) ([]ShippingRatePublic, error) {
	if db == nil {
		return nil, errors.New("db is nil")
	}
	var rates []models.ShippingRate
	if err := db.Where("is_active = ?", true).Order("country_name ASC").Find(&rates).Error; err != nil {
		return nil, err
	}
	out := make([]ShippingRatePublic, 0, len(rates))
	for _, r := range rates {
		cur := strings.TrimSpace(r.Currency)
		if cur == "" {
			cur = "USD"
		}
		out = append(out, ShippingRatePublic{CountryCode: r.CountryCode, CountryName: r.CountryName, Fee: r.Fee, Currency: cur})
	}
	return out, nil
}

func GenerateShippingRateTemplateXLSX() ([]byte, error) {
	f := excelize.NewFile()
	sheet := "ShippingRates"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"Country Code (ISO2)", "Country Name", "Shipping Fee", "Currency"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}
	// example
	_ = f.SetCellValue(sheet, "A2", "US")
	_ = f.SetCellValue(sheet, "B2", "United States")
	_ = f.SetCellValue(sheet, "C2", 35)
	_ = f.SetCellValue(sheet, "D2", "USD")

	_ = f.SetCellValue(sheet, "A3", "CN")
	_ = f.SetCellValue(sheet, "B3", "China")
	_ = f.SetCellValue(sheet, "C3", 10)
	_ = f.SetCellValue(sheet, "D3", "USD")

	_ = f.SetColWidth(sheet, "A", "A", 18)
	_ = f.SetColWidth(sheet, "B", "B", 22)
	_ = f.SetColWidth(sheet, "C", "C", 16)
	_ = f.SetColWidth(sheet, "D", "D", 12)
	_ = f.SetPanes(sheet, &excelize.Panes{Freeze: true, Split: true, YSplit: 1, ActivePane: "bottomLeft"})

	headerStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}, Fill: excelize.Fill{Type: "pattern", Color: []string{"#F3F4F6"}, Pattern: 1}})
	_ = f.SetCellStyle(sheet, "A1", "D1", headerStyle)

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

type ShippingRateImportItem struct {
	RowNumber   int    `json:"row_number"`
	CountryCode string `json:"country_code"`
	Action      string `json:"action"` // created | updated | failed | skipped
	Message     string `json:"message,omitempty"`
}

type ShippingRateImportResult struct {
	TotalRows int                      `json:"total_rows"`
	Created   int                      `json:"created"`
	Updated   int                      `json:"updated"`
	Failed    int                      `json:"failed"`
	Items     []ShippingRateImportItem `json:"items"`
}

func ImportShippingRatesFromXLSX(ctx context.Context, db *gorm.DB, r io.Reader) (ShippingRateImportResult, error) {
	if db == nil {
		return ShippingRateImportResult{}, errors.New("db is nil")
	}
	data, err := io.ReadAll(r)
	if err != nil {
		return ShippingRateImportResult{}, err
	}
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return ShippingRateImportResult{}, err
	}
	defer func() { _ = f.Close() }()

	sheet := f.GetSheetName(0)
	if sheet == "" {
		sheet = "ShippingRates"
	}
	rows, err := f.GetRows(sheet)
	if err != nil {
		return ShippingRateImportResult{}, err
	}
	if len(rows) <= 1 {
		return ShippingRateImportResult{TotalRows: 0, Items: []ShippingRateImportItem{}}, nil
	}

	// header mapping
	header := rows[0]
	colCode, colName, colFee, colCur := 0, 1, 2, 3
	for i, h := range header {
		k := strings.ToLower(strings.TrimSpace(h))
		k = strings.ReplaceAll(k, " ", "")
		switch {
		case strings.Contains(k, "countrycode") || strings.Contains(k, "iso") || k == "code":
			colCode = i
		case strings.Contains(k, "countryname") || k == "name":
			colName = i
		case strings.Contains(k, "shippingfee") || strings.Contains(k, "fee") || strings.Contains(k, "rate"):
			colFee = i
		case strings.Contains(k, "currency") || k == "cur":
			colCur = i
		}
	}

	items := make([]ShippingRateImportItem, 0)
	result := ShippingRateImportResult{Items: items}

	// Pre-scan valid rows
	type rowData struct {
		RowNumber int
		Code      string
		Name      string
		Fee       float64
		Currency  string
	}
	list := make([]rowData, 0, len(rows)-1)
	for i := 1; i < len(rows); i++ {
		r := rows[i]
		get := func(idx int) string {
			if idx < 0 || idx >= len(r) {
				return ""
			}
			return r[idx]
		}
		code := NormalizeCountryCode(get(colCode))
		name := strings.TrimSpace(get(colName))
		feeStr := strings.TrimSpace(get(colFee))
		cur := strings.ToUpper(strings.TrimSpace(get(colCur)))
		if cur == "" {
			cur = "USD"
		}
		if code == "" && name == "" && feeStr == "" {
			continue
		}
		if code == "" {
			result.Failed++
			result.Items = append(result.Items, ShippingRateImportItem{RowNumber: i + 1, CountryCode: "", Action: "failed", Message: "country code is empty"})
			continue
		}
		feeStr = strings.ReplaceAll(feeStr, ",", "")
		fee := 0.0
		if feeStr != "" {
			fval, e := strconv.ParseFloat(feeStr, 64)
			if e != nil {
				result.Failed++
				result.Items = append(result.Items, ShippingRateImportItem{RowNumber: i + 1, CountryCode: code, Action: "failed", Message: fmt.Sprintf("invalid fee: %v", e)})
				continue
			}
			fee = fval
		}
		if name == "" {
			name = code
		}
		list = append(list, rowData{RowNumber: i + 1, Code: code, Name: name, Fee: fee, Currency: cur})
	}

	result.TotalRows = len(list)
	if len(list) == 0 {
		return result, nil
	}

	// Deduplicate by code; keep last occurrence
	byCode := map[string]rowData{}
	order := make([]string, 0)
	for _, rd := range list {
		if _, ok := byCode[rd.Code]; !ok {
			order = append(order, rd.Code)
		}
		byCode[rd.Code] = rd
	}
	sort.Strings(order)

	err = db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, code := range order {
			rd := byCode[code]
			var existing models.ShippingRate
			err := tx.Where("country_code = ?", rd.Code).First(&existing).Error
			if err == nil {
				existing.CountryName = rd.Name
				existing.Fee = rd.Fee
				existing.Currency = rd.Currency
				existing.IsActive = true
				if e := tx.Save(&existing).Error; e != nil {
					result.Failed++
					result.Items = append(result.Items, ShippingRateImportItem{RowNumber: rd.RowNumber, CountryCode: rd.Code, Action: "failed", Message: e.Error()})
					continue
				}
				result.Updated++
				result.Items = append(result.Items, ShippingRateImportItem{RowNumber: rd.RowNumber, CountryCode: rd.Code, Action: "updated", Message: "updated"})
				continue
			}
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				result.Failed++
				result.Items = append(result.Items, ShippingRateImportItem{RowNumber: rd.RowNumber, CountryCode: rd.Code, Action: "failed", Message: err.Error()})
				continue
			}

			n := models.ShippingRate{CountryCode: rd.Code, CountryName: rd.Name, Fee: rd.Fee, Currency: rd.Currency, IsActive: true}
			if e := tx.Create(&n).Error; e != nil {
				result.Failed++
				result.Items = append(result.Items, ShippingRateImportItem{RowNumber: rd.RowNumber, CountryCode: rd.Code, Action: "failed", Message: e.Error()})
				continue
			}
			result.Created++
			result.Items = append(result.Items, ShippingRateImportItem{RowNumber: rd.RowNumber, CountryCode: rd.Code, Action: "created", Message: "created"})
		}
		return nil
	})
	if err != nil {
		return result, err
	}
	return result, nil
}
