package services

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"sort"
	"strconv"
	"strings"

	"fanuc-backend/models"

	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ShippingCountryPublic struct {
	CountryCode string `json:"country_code"`
	CountryName string `json:"country_name"`
	Currency    string `json:"currency"`
}

type ShippingQuoteResult struct {
	CountryCode   string  `json:"country_code"`
	Currency      string  `json:"currency"`
	WeightKg      float64 `json:"weight_kg"`
	BillingWeight float64 `json:"billing_weight_kg"`
	RatePerKg     float64 `json:"rate_per_kg"`
	BaseQuote     float64 `json:"base_quote"`
	AdditionalFee float64 `json:"additional_fee"`
	ShippingFee   float64 `json:"shipping_fee"`
}

func NormalizeCountryCode(code string) string {
	c := strings.ToUpper(strings.TrimSpace(code))
	if len(c) > 2 {
		c = c[:2]
	}
	return c
}

func ListActiveShippingCountries(db *gorm.DB) ([]ShippingCountryPublic, error) {
	if db == nil {
		return nil, errors.New("db is nil")
	}
	var tpls []models.ShippingTemplate
	if err := db.Where("is_active = ?", true).Order("country_name ASC").Find(&tpls).Error; err != nil {
		return nil, err
	}
	out := make([]ShippingCountryPublic, 0, len(tpls))
	for _, t := range tpls {
		cur := strings.TrimSpace(t.Currency)
		if cur == "" {
			cur = "USD"
		}
		out = append(out, ShippingCountryPublic{CountryCode: t.CountryCode, CountryName: t.CountryName, Currency: cur})
	}
	return out, nil
}

func CalculateShippingQuote(db *gorm.DB, countryCode string, weightKg float64) (ShippingQuoteResult, error) {
	if db == nil {
		return ShippingQuoteResult{}, errors.New("db is nil")
	}
	cc := NormalizeCountryCode(countryCode)
	if cc == "" {
		return ShippingQuoteResult{}, errors.New("country_code is empty")
	}
	if weightKg < 0 {
		weightKg = 0
	}
	if weightKg == 0 {
		return ShippingQuoteResult{CountryCode: cc, Currency: "USD", WeightKg: 0, BillingWeight: 0, RatePerKg: 0, BaseQuote: 0, AdditionalFee: 0, ShippingFee: 0}, nil
	}

	var tpl models.ShippingTemplate
	if err := db.Where("country_code = ? AND is_active = ?", cc, true).First(&tpl).Error; err != nil {
		return ShippingQuoteResult{}, err
	}
	cur := strings.TrimSpace(tpl.Currency)
	if cur == "" {
		cur = "USD"
	}

	// Load brackets
	var brackets []models.ShippingWeightBracket
	if err := db.Where("template_id = ?", tpl.ID).Order("min_kg ASC, max_kg ASC").Find(&brackets).Error; err != nil {
		return ShippingQuoteResult{}, err
	}
	if len(brackets) == 0 {
		return ShippingQuoteResult{}, errors.New("no weight brackets configured")
	}

	// Billing weight rules:
	// - For weight < 21kg: round up to the next whole kg (15.6 -> 16)
	// - For weight >= 21kg: use the actual weight
	billingWeightKg := weightKg
	if weightKg > 0 && weightKg < 21 {
		billingWeightKg = math.Ceil(weightKg)
		if billingWeightKg < 1 {
			billingWeightKg = 1
		}
	}

	// < 21kg prefers fixed-fee rows: min_kg == max_kg == billed integer kg
	ratePerKg := 0.0
	baseQuote := 0.0
	if billingWeightKg > 0 && billingWeightKg < 21 {
		fixedFound := false
		for _, b := range brackets {
			if round3(b.MinKg) == round3(billingWeightKg) && round3(b.MaxKg) == round3(billingWeightKg) {
				baseQuote = round2(b.RatePerKg)
				fixedFound = true
				break
			}
		}
		if !fixedFound {
			// fallback: use per-kg brackets if the sheet didn't provide fixed fees
			r, err := matchRatePerKg(brackets, billingWeightKg)
			if err != nil {
				return ShippingQuoteResult{}, err
			}
			ratePerKg = r
			baseQuote = round2(billingWeightKg * ratePerKg)
		}
	} else {
		r, err := matchRatePerKg(brackets, billingWeightKg)
		if err != nil {
			return ShippingQuoteResult{}, err
		}
		ratePerKg = r
		baseQuote = round2(billingWeightKg * ratePerKg)
	}

	// Load surcharge rules (optional)
	var sur []models.ShippingQuoteSurcharge
	_ = db.Where("template_id = ?", tpl.ID).Order("quote_amount ASC").Find(&sur).Error
	extra := matchAdditionalFee(sur, baseQuote)
	shippingFee := round2(baseQuote + extra)

	return ShippingQuoteResult{
		CountryCode:   cc,
		Currency:      cur,
		WeightKg:      round3(weightKg),
		BillingWeight: round3(billingWeightKg),
		RatePerKg:     round3(ratePerKg),
		BaseQuote:     baseQuote,
		AdditionalFee: round2(extra),
		ShippingFee:   shippingFee,
	}, nil
}

func matchRatePerKg(brackets []models.ShippingWeightBracket, weightKg float64) (float64, error) {
	// Pick the first matching bracket, preferring the most specific (largest min).
	// max_kg <= 0 is treated as no upper limit.
	if len(brackets) == 0 {
		return 0, errors.New("no weight brackets configured")
	}

	// Make sure input is sorted (DB query should already be ordered).
	sort.SliceStable(brackets, func(i, j int) bool {
		if brackets[i].MinKg != brackets[j].MinKg {
			return brackets[i].MinKg < brackets[j].MinKg
		}
		return brackets[i].MaxKg < brackets[j].MaxKg
	})

	var candidates []models.ShippingWeightBracket
	for _, b := range brackets {
		min := b.MinKg
		max := b.MaxKg
		if max <= 0 {
			if weightKg >= min {
				candidates = append(candidates, b)
			}
			continue
		}
		if weightKg >= min && weightKg <= max {
			candidates = append(candidates, b)
		}
	}
	if len(candidates) == 0 {
		first := brackets[0]
		// If below min of all, use the first bracket.
		if weightKg < first.MinKg {
			if first.MinKg > 0 {
				return 0, fmt.Errorf("no matching weight bracket for %.3fkg (min configured %.3fkg)", weightKg, first.MinKg)
			}
			return first.RatePerKg, nil
		}
		// If above max of all, use the last bracket.
		last := brackets[len(brackets)-1]
		if last.MaxKg <= 0 || weightKg > last.MaxKg {
			return last.RatePerKg, nil
		}
		return 0, fmt.Errorf("no matching weight bracket for %.3fkg", weightKg)
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		// higher min first
		if candidates[i].MinKg != candidates[j].MinKg {
			return candidates[i].MinKg > candidates[j].MinKg
		}
		// smaller max first (treat max<=0 as +inf)
		iMax := candidates[i].MaxKg
		jMax := candidates[j].MaxKg
		if iMax <= 0 {
			iMax = math.MaxFloat64
		}
		if jMax <= 0 {
			jMax = math.MaxFloat64
		}
		return iMax < jMax
	})
	return candidates[0].RatePerKg, nil
}

func matchAdditionalFee(surcharges []models.ShippingQuoteSurcharge, baseQuote float64) float64 {
	if len(surcharges) == 0 {
		return 0
	}
	// Choose the smallest quote_amount >= baseQuote.
	// If multiple rows have the same quote_amount, choose the highest additional fee.
	minQuote := math.MaxFloat64
	fee := 0.0
	found := false
	for _, s := range surcharges {
		if s.QuoteAmount >= baseQuote {
			if s.QuoteAmount < minQuote {
				minQuote = s.QuoteAmount
				fee = s.AdditionalFee
				found = true
			} else if s.QuoteAmount == minQuote && s.AdditionalFee > fee {
				fee = s.AdditionalFee
				found = true
			}
		}
	}
	if found {
		return fee
	}
	// else: use the largest quote_amount, also resolving duplicates by max fee
	maxQuote := -1.0
	fee = 0.0
	for _, s := range surcharges {
		if s.QuoteAmount > maxQuote {
			maxQuote = s.QuoteAmount
			fee = s.AdditionalFee
		} else if s.QuoteAmount == maxQuote && s.AdditionalFee > fee {
			fee = s.AdditionalFee
		}
	}
	return fee
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }
func round3(v float64) float64 { return math.Round(v*1000) / 1000 }

// XLSX

func GenerateShippingTemplateXLSX_USSample() ([]byte, error) {
	// Single-sheet template matching the requested layout.
	// Section A (<21kg): per-country weight->fee rows (billing weight rounds up: 15.6 -> 16)
	// Section B (>=21kg): per-country weight ranges with price per kg
	f := excelize.NewFile()
	sheet := "Shipping"
	f.SetSheetName("Sheet1", sheet)

	// Section A header (3-column group per country)
	_ = f.SetCellValue(sheet, "A1", "US")
	_ = f.SetCellValue(sheet, "B1", "重量(kg)")
	_ = f.SetCellValue(sheet, "C1", "价格(运费)")
	_ = f.SetCellValue(sheet, "D1", "CN")
	_ = f.SetCellValue(sheet, "E1", "重量(kg)")
	_ = f.SetCellValue(sheet, "F1", "价格(运费)")

	// Minimal sample rows
	_ = f.SetCellValue(sheet, "B2", 1)
	_ = f.SetCellValue(sheet, "C2", 12)
	_ = f.SetCellValue(sheet, "B3", 16)
	_ = f.SetCellValue(sheet, "C3", 34)
	_ = f.SetCellValue(sheet, "E2", 1)
	_ = f.SetCellValue(sheet, "F2", 8)
	_ = f.SetCellValue(sheet, "E3", 16)
	_ = f.SetCellValue(sheet, "F3", 20)

	// Section B header
	start := 6
	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", start), ">=21kg 区间(每公斤价格)")
	_ = f.MergeCell(sheet, fmt.Sprintf("A%d", start), fmt.Sprintf("C%d", start))
	start++
	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", start), "国家代码")
	_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", start), "重量区间(kg)")
	_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", start), "每公斤价格")
	start++
	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", start), "US")
	_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", start), "21.0 - 44.0")
	_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", start), 10)
	start++
	_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", start), "US")
	_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", start), "71.0 - 99.0")
	_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", start), 9)

	// Style
	_ = f.SetPanes(sheet, &excelize.Panes{Freeze: true, Split: true, YSplit: 1, ActivePane: "bottomLeft"})
	headerStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}, Fill: excelize.Fill{Type: "pattern", Color: []string{"#F3F4F6"}, Pattern: 1}})
	_ = f.SetCellStyle(sheet, "A1", "F1", headerStyle)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", start-3), fmt.Sprintf("C%d", start-3), headerStyle)

	_ = f.SetColWidth(sheet, "A", "F", 16)

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

type ShippingTemplateImportResult struct {
	Countries int      `json:"countries"`
	Created   int      `json:"created"`
	Updated   int      `json:"updated"`
	Deleted   int      `json:"deleted"`
	Failed    int      `json:"failed"`
	Errors    []string `json:"errors"`
}

// ImportShippingTemplatesFromXLSX imports both sheets and upserts templates and rules.
// If replace=true, existing rules for affected countries are deleted before insert.
func ImportShippingTemplatesFromXLSX(ctx context.Context, db *gorm.DB, r io.Reader, replace bool) (ShippingTemplateImportResult, error) {
	if db == nil {
		return ShippingTemplateImportResult{}, errors.New("db is nil")
	}
	b, err := io.ReadAll(r)
	if err != nil {
		return ShippingTemplateImportResult{}, err
	}
	f, err := excelize.OpenReader(bytes.NewReader(b))
	if err != nil {
		return ShippingTemplateImportResult{}, err
	}
	defer func() { _ = f.Close() }()

	quotes, qErrs := parseQuoteSheet(f)
	weights, wErrs := parseWeightSheet(f)
	// Support a single-sheet layout (no WeightKg sheet)
	if len(wErrs) == 1 && strings.Contains(strings.ToLower(wErrs[0]), "missing sheet: weightkg") {
		weights, wErrs = parseSingleSheetWeights(f)
		// single-sheet format doesn't include quote surcharge in the requested layout
		quotes = []quoteRow{}
		qErrs = []string{}
	}

	res := ShippingTemplateImportResult{Errors: []string{}}
	res.Errors = append(res.Errors, qErrs...)
	res.Errors = append(res.Errors, wErrs...)
	if len(res.Errors) > 0 {
		res.Failed = len(res.Errors)
		return res, fmt.Errorf("xlsx parse errors")
	}

	// Collect affected countries
	affected := map[string]struct{}{}
	for _, q := range quotes {
		affected[q.CountryCode] = struct{}{}
	}
	for _, w := range weights {
		affected[w.CountryCode] = struct{}{}
	}
	res.Countries = len(affected)

	err = db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Upsert templates
		for cc := range affected {
			name := cc
			cur := "USD"
			if n, ok := pickCountryName(cc, quotes, weights); ok {
				name = n
			}
			if c, ok := pickCurrency(cc, quotes, weights); ok {
				cur = c
			}
			var tpl models.ShippingTemplate
			if e := tx.Where("country_code = ?", cc).First(&tpl).Error; e == nil {
				tpl.CountryName = name
				tpl.Currency = cur
				tpl.IsActive = true
				if e2 := tx.Save(&tpl).Error; e2 != nil {
					return e2
				}
				res.Updated++
			} else if errors.Is(e, gorm.ErrRecordNotFound) {
				tpl = models.ShippingTemplate{CountryCode: cc, CountryName: name, Currency: cur, IsActive: true}
				if e2 := tx.Create(&tpl).Error; e2 != nil {
					return e2
				}
				res.Created++
			} else {
				return e
			}
		}

		// Replace rules if requested
		if replace {
			for cc := range affected {
				var tpl models.ShippingTemplate
				if e := tx.Where("country_code = ?", cc).First(&tpl).Error; e != nil {
					return e
				}
				if e := tx.Where("template_id = ?", tpl.ID).Delete(&models.ShippingWeightBracket{}).Error; e != nil {
					return e
				}
				if e := tx.Where("template_id = ?", tpl.ID).Delete(&models.ShippingQuoteSurcharge{}).Error; e != nil {
					return e
				}
				res.Deleted++
			}
		}

		// Insert/upsert rules
		for _, w := range weights {
			var tpl models.ShippingTemplate
			if e := tx.Where("country_code = ?", w.CountryCode).First(&tpl).Error; e != nil {
				return e
			}
			// upsert by (template_id, min,max)
			var ex models.ShippingWeightBracket
			e := tx.Where("template_id = ? AND min_kg = ? AND max_kg = ?", tpl.ID, w.MinKg, w.MaxKg).First(&ex).Error
			if e == nil {
				ex.RatePerKg = w.RatePerKg
				_ = tx.Save(&ex).Error
				continue
			}
			if e != nil && !errors.Is(e, gorm.ErrRecordNotFound) {
				return e
			}
			_ = tx.Create(&models.ShippingWeightBracket{TemplateID: tpl.ID, MinKg: w.MinKg, MaxKg: w.MaxKg, RatePerKg: w.RatePerKg}).Error
		}
		for _, q := range quotes {
			var tpl models.ShippingTemplate
			if e := tx.Where("country_code = ?", q.CountryCode).First(&tpl).Error; e != nil {
				return e
			}
			var ex models.ShippingQuoteSurcharge
			e := tx.Where("template_id = ? AND quote_amount = ?", tpl.ID, q.QuoteAmount).First(&ex).Error
			if e == nil {
				ex.AdditionalFee = q.AdditionalFee
				_ = tx.Save(&ex).Error
				continue
			}
			if e != nil && !errors.Is(e, gorm.ErrRecordNotFound) {
				return e
			}
			_ = tx.Create(&models.ShippingQuoteSurcharge{TemplateID: tpl.ID, QuoteAmount: q.QuoteAmount, AdditionalFee: q.AdditionalFee}).Error
		}

		return nil
	})
	if err != nil {
		return res, err
	}
	return res, nil
}

type quoteRow struct {
	CountryCode   string
	CountryName   string
	QuoteAmount   float64
	AdditionalFee float64
	Currency      string
}

type weightRow struct {
	CountryCode string
	CountryName string
	MinKg       float64
	MaxKg       float64
	RatePerKg   float64
	Currency    string
}

func parseMoney(s string) (float64, error) {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, ",", "")
	if s == "" {
		return 0, nil
	}
	return strconv.ParseFloat(s, 64)
}

func parseFloat(s string) (float64, error) {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", "")
	if s == "" {
		return 0, nil
	}
	return strconv.ParseFloat(s, 64)
}

func parseQuoteSheet(f *excelize.File) ([]quoteRow, []string) {
	name := "QuoteSurcharge"
	idx, err := f.GetSheetIndex(name)
	if err != nil || idx == -1 {
		// ok: optional
		return []quoteRow{}, nil
	}
	rows, err := f.GetRows(name)
	if err != nil {
		return nil, []string{err.Error()}
	}
	if len(rows) <= 1 {
		return []quoteRow{}, nil
	}
	head := rows[0]
	colCode, colName, colQuote, colFee, colCur := 0, 1, 2, 3, 4
	for i, h := range head {
		k := strings.ToLower(strings.TrimSpace(h))
		k = strings.ReplaceAll(k, " ", "")
		switch {
		case strings.Contains(k, "countrycode") || k == "code":
			colCode = i
		case strings.Contains(k, "countryname") || k == "name":
			colName = i
		case strings.Contains(k, "quote"):
			colQuote = i
		case strings.Contains(k, "additional") || strings.Contains(k, "fee") || strings.Contains(k, "surcharge"):
			colFee = i
		case strings.Contains(k, "currency") || k == "cur":
			colCur = i
		}
	}

	errs := []string{}
	out := make([]quoteRow, 0)
	for i := 1; i < len(rows); i++ {
		r := rows[i]
		get := func(idx int) string {
			if idx < 0 || idx >= len(r) {
				return ""
			}
			return r[idx]
		}
		cc := NormalizeCountryCode(get(colCode))
		if cc == "" {
			continue
		}
		q, e := parseMoney(get(colQuote))
		if e != nil {
			errs = append(errs, fmt.Sprintf("%s row %d: invalid quote: %v", name, i+1, e))
			continue
		}
		fee, e := parseMoney(get(colFee))
		if e != nil {
			errs = append(errs, fmt.Sprintf("%s row %d: invalid additional fee: %v", name, i+1, e))
			continue
		}
		cn := strings.TrimSpace(get(colName))
		cur := strings.ToUpper(strings.TrimSpace(get(colCur)))
		if cur == "" {
			cur = "USD"
		}
		if q <= 0 {
			continue
		}
		out = append(out, quoteRow{CountryCode: cc, CountryName: cn, QuoteAmount: round2(q), AdditionalFee: round2(fee), Currency: cur})
	}
	return out, errs
}

func parseWeightSheet(f *excelize.File) ([]weightRow, []string) {
	name := "WeightKg"
	idx, err := f.GetSheetIndex(name)
	if err != nil || idx == -1 {
		return nil, []string{"missing sheet: WeightKg"}
	}
	rows, err := f.GetRows(name)
	if err != nil {
		return nil, []string{err.Error()}
	}
	if len(rows) <= 1 {
		return nil, []string{"WeightKg sheet has no data"}
	}
	head := rows[0]
	colCode, colName, colMin, colMax, colRate, colCur := 0, 1, 2, 3, 4, 5
	for i, h := range head {
		k := strings.ToLower(strings.TrimSpace(h))
		k = strings.ReplaceAll(k, " ", "")
		switch {
		case strings.Contains(k, "countrycode") || k == "code":
			colCode = i
		case strings.Contains(k, "countryname") || k == "name":
			colName = i
		case strings.Contains(k, "minkg") || strings.Contains(k, "min"):
			colMin = i
		case strings.Contains(k, "maxkg") || strings.Contains(k, "max"):
			colMax = i
		case strings.Contains(k, "rate"):
			colRate = i
		case strings.Contains(k, "currency") || k == "cur":
			colCur = i
		}
	}

	errs := []string{}
	out := make([]weightRow, 0)
	for i := 1; i < len(rows); i++ {
		r := rows[i]
		get := func(idx int) string {
			if idx < 0 || idx >= len(r) {
				return ""
			}
			return r[idx]
		}
		cc := NormalizeCountryCode(get(colCode))
		if cc == "" {
			continue
		}
		minV, maxV, e := parseMinMaxKg(get(colMin), get(colMax))
		if e != nil {
			errs = append(errs, fmt.Sprintf("%s row %d: invalid kg range: %v", name, i+1, e))
			continue
		}
		rate, e := parseMoney(get(colRate))
		if e != nil {
			errs = append(errs, fmt.Sprintf("%s row %d: invalid rate: %v", name, i+1, e))
			continue
		}
		cn := strings.TrimSpace(get(colName))
		cur := strings.ToUpper(strings.TrimSpace(get(colCur)))
		if cur == "" {
			cur = "USD"
		}
		if minV == 0 && maxV == 0 {
			continue
		}
		out = append(out, weightRow{CountryCode: cc, CountryName: cn, MinKg: round3(minV), MaxKg: round3(maxV), RatePerKg: round3(rate), Currency: cur})
	}
	return out, errs
}

type countryGroup struct {
	CountryCode string
	WeightCol   int
	PriceCol    int
}

func parseSingleSheetWeights(f *excelize.File) ([]weightRow, []string) {
	sheet := f.GetSheetName(0)
	if strings.TrimSpace(sheet) == "" {
		sheet = "Sheet1"
	}
	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, []string{err.Error()}
	}
	if len(rows) <= 1 {
		return nil, []string{"single-sheet template has no data"}
	}

	head := rows[0]
	groups := detectCountryGroups(head)
	if len(groups) == 0 {
		return nil, []string{"single-sheet template: failed to detect country columns"}
	}

	errStrs := []string{}
	out := make([]weightRow, 0)

	get := func(r []string, idx int) string {
		if idx < 0 || idx >= len(r) {
			return ""
		}
		return r[idx]
	}

	// Detect where the >=21kg table starts (first row like: US | 21.0 - 44.0 | 10)
	bracketStart := len(rows)
	for i := 1; i < len(rows); i++ {
		r := rows[i]
		if len(r) < 3 {
			continue
		}
		cc := NormalizeCountryCode(strings.TrimSpace(r[0]))
		if cc == "" {
			continue
		}
		rng := strings.TrimSpace(r[1])
		if rng == "" {
			continue
		}
		if !strings.Contains(rng, "-") && !strings.Contains(rng, "—") && !strings.Contains(rng, "–") {
			continue
		}
		if _, err := parseMoney(strings.TrimSpace(r[2])); err != nil {
			continue
		}
		bracketStart = i
		break
	}

	// Section A: <21kg fixed fees (weight -> fee)
	for i := 1; i < bracketStart; i++ {
		r := rows[i]
		for _, g := range groups {
			wStr := strings.TrimSpace(get(r, g.WeightCol))
			pStr := strings.TrimSpace(get(r, g.PriceCol))
			if wStr == "" && pStr == "" {
				continue
			}
			w, e := parseFloat(wStr)
			if e != nil {
				errStrs = append(errStrs, fmt.Sprintf("%s row %d: invalid weight for %s: %v", sheet, i+1, g.CountryCode, e))
				continue
			}
			fee, e := parseMoney(pStr)
			if e != nil {
				errStrs = append(errStrs, fmt.Sprintf("%s row %d: invalid fee for %s: %v", sheet, i+1, g.CountryCode, e))
				continue
			}
			if w <= 0 || w >= 21 {
				continue
			}
			cc := NormalizeCountryCode(g.CountryCode)
			out = append(out, weightRow{CountryCode: cc, CountryName: cc, MinKg: round3(w), MaxKg: round3(w), RatePerKg: round3(fee), Currency: "USD"})
		}
	}

	// Section B: >=21kg brackets (country_code, "21.0 - 44.0", price_per_kg)
	for i := bracketStart; i < len(rows); i++ {
		r := rows[i]
		if len(r) < 3 {
			continue
		}
		cc := NormalizeCountryCode(strings.TrimSpace(r[0]))
		if cc == "" {
			continue
		}
		rng := strings.TrimSpace(r[1])
		if rng == "" {
			continue
		}
		if !strings.Contains(rng, "-") && !strings.Contains(rng, "—") && !strings.Contains(rng, "–") {
			continue
		}
		minV, maxV, e := parseMinMaxKg(rng, "")
		if e != nil {
			errStrs = append(errStrs, fmt.Sprintf("%s row %d: invalid range for %s: %v", sheet, i+1, cc, e))
			continue
		}
		rate, e := parseMoney(strings.TrimSpace(r[2]))
		if e != nil {
			errStrs = append(errStrs, fmt.Sprintf("%s row %d: invalid price for %s: %v", sheet, i+1, cc, e))
			continue
		}
		if minV == 0 && maxV == 0 {
			continue
		}
		out = append(out, weightRow{CountryCode: cc, CountryName: cc, MinKg: round3(minV), MaxKg: round3(maxV), RatePerKg: round3(rate), Currency: "USD"})
	}

	return out, errStrs
}

func detectCountryGroups(head []string) []countryGroup {
	weightKW := func(s string) bool {
		s = strings.ToLower(s)
		return strings.Contains(s, "weight") || strings.Contains(s, "kg") || strings.Contains(s, "重量")
	}
	priceKW := func(s string) bool {
		s = strings.ToLower(s)
		return strings.Contains(s, "price") || strings.Contains(s, "fee") || strings.Contains(s, "运费") || strings.Contains(s, "价格")
	}

	groups := []countryGroup{}

	// Prefer 3-column groups: [US][weight][price][CN][weight][price]...
	for i := 0; i < len(head); {
		cell := strings.TrimSpace(head[i])
		if len(cell) == 2 && cell == strings.ToUpper(cell) {
			cc := NormalizeCountryCode(cell)
			if cc != "" && i+2 < len(head) && weightKW(head[i+1]) && priceKW(head[i+2]) {
				groups = append(groups, countryGroup{CountryCode: cc, WeightCol: i + 1, PriceCol: i + 2})
				i += 3
				continue
			}
		}
		i++
	}
	if len(groups) > 0 {
		return groups
	}

	// Fallback: 2-column groups where each header contains the country code.
	for i := 0; i < len(head); i++ {
		h := strings.TrimSpace(head[i])
		cc := ""
		for _, token := range strings.FieldsFunc(h, func(r rune) bool { return r == ' ' || r == '_' || r == '-' || r == '/' }) {
			if len(token) == 2 && token == strings.ToUpper(token) {
				cc = NormalizeCountryCode(token)
				break
			}
		}
		if cc == "" {
			continue
		}
		if weightKW(h) {
			// find the nearest price column for the same cc
			for j := i + 1; j < len(head) && j <= i+2; j++ {
				h2 := strings.TrimSpace(head[j])
				if strings.Contains(strings.ToUpper(h2), cc) && priceKW(h2) {
					groups = append(groups, countryGroup{CountryCode: cc, WeightCol: i, PriceCol: j})
					break
				}
			}
		}
	}

	return groups
}

func parseMinMaxKg(minCell string, maxCell string) (float64, float64, error) {
	minCell = strings.TrimSpace(minCell)
	maxCell = strings.TrimSpace(maxCell)

	// Support user-friendly range input like: "21.0 - 44.0" (either column).
	parseRange := func(s string) (float64, float64, bool, error) {
		s = strings.TrimSpace(s)
		if s == "" {
			return 0, 0, false, nil
		}
		// Normalize dashes
		s = strings.ReplaceAll(s, "—", "-")
		s = strings.ReplaceAll(s, "–", "-")
		if !strings.Contains(s, "-") {
			return 0, 0, false, nil
		}
		parts := strings.Split(s, "-")
		if len(parts) < 2 {
			return 0, 0, false, fmt.Errorf("invalid range")
		}
		left := strings.TrimSpace(parts[0])
		right := strings.TrimSpace(parts[1])
		minV, err := parseFloat(left)
		if err != nil {
			return 0, 0, false, err
		}
		maxV, err := parseFloat(right)
		if err != nil {
			return 0, 0, false, err
		}
		return minV, maxV, true, nil
	}

	if minV, maxV, ok, err := parseRange(minCell); err != nil {
		return 0, 0, err
	} else if ok {
		if minV < 0 {
			minV = 0
		}
		if maxV != 0 && maxV < minV {
			return 0, 0, fmt.Errorf("max < min")
		}
		return minV, maxV, nil
	}
	if minV, maxV, ok, err := parseRange(maxCell); err != nil {
		return 0, 0, err
	} else if ok {
		if minV < 0 {
			minV = 0
		}
		if maxV != 0 && maxV < minV {
			return 0, 0, fmt.Errorf("max < min")
		}
		return minV, maxV, nil
	}

	minV, err := parseFloat(minCell)
	if err != nil {
		return 0, 0, err
	}
	maxV, err := parseFloat(maxCell)
	if err != nil {
		return 0, 0, err
	}
	if minV < 0 {
		minV = 0
	}
	// max==0 means infinity
	if maxV != 0 && maxV < minV {
		return 0, 0, fmt.Errorf("max < min")
	}
	return minV, maxV, nil
}

func pickCountryName(cc string, quotes []quoteRow, weights []weightRow) (string, bool) {
	for _, w := range weights {
		if w.CountryCode == cc && strings.TrimSpace(w.CountryName) != "" {
			return w.CountryName, true
		}
	}
	for _, q := range quotes {
		if q.CountryCode == cc && strings.TrimSpace(q.CountryName) != "" {
			return q.CountryName, true
		}
	}
	return "", false
}

func pickCurrency(cc string, quotes []quoteRow, weights []weightRow) (string, bool) {
	for _, w := range weights {
		if w.CountryCode == cc && strings.TrimSpace(w.Currency) != "" {
			return w.Currency, true
		}
	}
	for _, q := range quotes {
		if q.CountryCode == cc && strings.TrimSpace(q.Currency) != "" {
			return q.Currency, true
		}
	}
	return "", false
}
