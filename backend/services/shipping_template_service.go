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
		return ShippingQuoteResult{CountryCode: cc, Currency: "USD", WeightKg: 0, RatePerKg: 0, BaseQuote: 0, AdditionalFee: 0, ShippingFee: 0}, nil
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

	ratePerKg, err := matchRatePerKg(brackets, weightKg)
	if err != nil {
		return ShippingQuoteResult{}, err
	}
	baseQuote := round2(weightKg * ratePerKg)

	// Load surcharge rules (optional)
	var sur []models.ShippingQuoteSurcharge
	_ = db.Where("template_id = ?", tpl.ID).Order("quote_amount ASC").Find(&sur).Error
	extra := matchAdditionalFee(sur, baseQuote)
	shippingFee := round2(baseQuote + extra)

	return ShippingQuoteResult{
		CountryCode:   cc,
		Currency:      cur,
		WeightKg:      round3(weightKg),
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
	f := excelize.NewFile()
	// Sheet 1: Quote surcharge
	s1 := "QuoteSurcharge"
	f.SetSheetName("Sheet1", s1)
	head1 := []string{"国家代码(Country Code)", "国家(Country Name)", "报价(Quote)", "附加费(Additional Fee)", "币种(Currency)"}
	for i, h := range head1 {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(s1, cell, h)
	}
	// US sample (from your table)
	usRows := [][2]float64{
		{34, 1}, {36, 2}, {45, 2}, {54, 3}, {62, 4}, {62, 5}, {71, 6}, {79, 7}, {87, 7}, {95, 8}, {96, 9},
		{103, 10}, {111, 11}, {118, 12}, {126, 12}, {133, 13}, {141, 14}, {148, 15}, {156, 16}, {163, 17},
		{171, 17}, {176, 18}, {182, 19}, {188, 20}, {194, 21}, {200, 22}, {205, 22}, {211, 23}, {217, 24},
		{223, 25}, {228, 26}, {234, 27}, {240, 27}, {246, 28}, {251, 29}, {257, 30}, {263, 31}, {269, 32},
		{275, 32}, {280, 33}, {286, 34},
	}
	row := 2
	for _, p := range usRows {
		_ = f.SetCellValue(s1, fmt.Sprintf("A%d", row), "US")
		_ = f.SetCellValue(s1, fmt.Sprintf("B%d", row), "United States")
		_ = f.SetCellValue(s1, fmt.Sprintf("C%d", row), p[0])
		_ = f.SetCellValue(s1, fmt.Sprintf("D%d", row), p[1])
		_ = f.SetCellValue(s1, fmt.Sprintf("E%d", row), "USD")
		row++
	}

	// Sheet 2: Weight rates
	s2 := "WeightKg"
	idx, _ := f.NewSheet(s2)
	f.SetActiveSheet(idx)
	head2 := []string{"国家代码(Country Code)", "国家(Country Name)", "最小公斤(Min Kg)", "最大公斤(Max Kg)", "每公斤费用(Rate Per Kg)", "币种(Currency)"}
	for i, h := range head2 {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(s2, cell, h)
	}
	weightRows := [][3]float64{
		{21.0, 44.0, 10},
		{45.0, 70.0, 10},
		{71.0, 99.0, 9},
		{100.0, 299.0, 9},
		{300.0, 499.0, 9},
		{500.0, 999.0, 9},
		{1000.0, 99999.0, 9},
	}
	row = 2
	for _, w := range weightRows {
		_ = f.SetCellValue(s2, fmt.Sprintf("A%d", row), "US")
		_ = f.SetCellValue(s2, fmt.Sprintf("B%d", row), "United States")
		_ = f.SetCellValue(s2, fmt.Sprintf("C%d", row), w[0])
		_ = f.SetCellValue(s2, fmt.Sprintf("D%d", row), w[1])
		_ = f.SetCellValue(s2, fmt.Sprintf("E%d", row), w[2])
		_ = f.SetCellValue(s2, fmt.Sprintf("F%d", row), "USD")
		row++
	}

	// Style
	for _, sh := range []string{s1, s2} {
		_ = f.SetPanes(sh, &excelize.Panes{Freeze: true, Split: true, YSplit: 1, ActivePane: "bottomLeft"})
		headerStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}, Fill: excelize.Fill{Type: "pattern", Color: []string{"#F3F4F6"}, Pattern: 1}})
		endCol := "E"
		if sh == s2 {
			endCol = "F"
		}
		_ = f.SetCellStyle(sh, "A1", endCol+"1", headerStyle)
	}
	_ = f.SetColWidth(s1, "A", "B", 18)
	_ = f.SetColWidth(s1, "C", "D", 14)
	_ = f.SetColWidth(s1, "E", "E", 10)
	_ = f.SetColWidth(s2, "A", "B", 18)
	_ = f.SetColWidth(s2, "C", "E", 14)
	_ = f.SetColWidth(s2, "F", "F", 10)

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
