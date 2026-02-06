package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ShippingRateController manages template-based shipping.
// Paths kept as /shipping-rates for backwards compatibility.
type ShippingRateController struct{}

// Public: GET /api/v1/public/shipping/countries
func (sc *ShippingRateController) PublicCountries(c *gin.Context) {
	db := config.GetDB()
	carrier := strings.TrimSpace(c.Query("carrier"))
	serviceCode := strings.TrimSpace(c.Query("service"))
	var (
		list []services.ShippingCountryPublic
		err  error
	)
	if carrier != "" {
		// Carrier mode: return union of (carrier templates) and (default country templates)
		carrierList, e := services.ListActiveCarrierShippingCountries(db, carrier, serviceCode)
		if e != nil {
			err = e
		} else {
			defaultList, e2 := services.ListActiveShippingCountries(db)
			if e2 != nil {
				err = e2
			} else {
				// Merge by country code; prefer carrier entry when present.
				m := map[string]services.ShippingCountryPublic{}
				for _, it := range defaultList {
					m[strings.ToUpper(it.CountryCode)] = it
				}
				for _, it := range carrierList {
					m[strings.ToUpper(it.CountryCode)] = it
				}
				out := make([]services.ShippingCountryPublic, 0, len(m))
				for _, v := range m {
					out = append(out, v)
				}
				// Sort by country name for stable UX
				sort.SliceStable(out, func(i, j int) bool {
					return strings.ToLower(out[i].CountryName) < strings.ToLower(out[j].CountryName)
				})
				list = out
			}
		}
	} else {
		list, err = services.ListActiveShippingCountries(db)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to fetch countries", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: list})
}

// Public: GET /api/v1/public/shipping/quote?country=US&weight_kg=12.3
func (sc *ShippingRateController) PublicQuote(c *gin.Context) {
	carrier := strings.TrimSpace(c.Query("carrier"))
	serviceCode := strings.TrimSpace(c.Query("service"))
	cc := strings.TrimSpace(c.Query("country"))
	if cc == "" {
		cc = strings.TrimSpace(c.Query("country_code"))
	}
	if cc == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing country", Error: "missing_country"})
		return
	}
	wStr := strings.TrimSpace(c.Query("weight_kg"))
	if wStr == "" {
		wStr = strings.TrimSpace(c.Query("weight"))
	}
	weight := 0.0
	if wStr != "" {
		v, err := strconv.ParseFloat(strings.ReplaceAll(wStr, ",", ""), 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid weight", Error: err.Error()})
			return
		}
		weight = v
	}
	db := config.GetDB()
	var (
		q   services.ShippingQuoteResult
		err error
	)
	if carrier != "" {
		q, err = services.CalculateCarrierShippingQuote(db, carrier, serviceCode, cc, weight)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Carrier template missing for this country; fall back to default country template.
			q, err = services.CalculateShippingQuote(db, cc, weight)
			if err == nil {
				q.Source = "default_fallback"
				q.Carrier = services.NormalizeCarrier(carrier)
				q.ServiceCode = services.NormalizeServiceCode(serviceCode)
			}
		}
	} else {
		q, err = services.CalculateShippingQuote(db, cc, weight)
	}
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Shipping template not found", Error: "not_found"})
			return
		}
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to calculate shipping", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: q})
}

// Admin: GET /api/v1/admin/shipping-rates
func (sc *ShippingRateController) AdminList(c *gin.Context) {
	db := config.GetDB()
	q := strings.TrimSpace(c.Query("q"))
	typeParam := strings.ToLower(strings.TrimSpace(c.Query("type")))
	if typeParam == "carrier" {
		carrier := services.NormalizeCarrier(c.Query("carrier"))
		serviceCode := services.NormalizeServiceCode(c.Query("service"))

		query := db.Model(&models.ShippingCarrierTemplate{})
		if carrier != "" {
			query = query.Where("carrier = ?", carrier)
		}
		if serviceCode != "" {
			query = query.Where("service_code = ?", serviceCode)
		}
		if q != "" {
			like := "%" + q + "%"
			query = query.Where("country_code LIKE ? OR country_name LIKE ?", like, like)
		}

		var tpls []models.ShippingCarrierTemplate
		if err := query.Order("carrier ASC, service_code ASC, country_name ASC").Find(&tpls).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to list templates", Error: err.Error()})
			return
		}

		out := make([]gin.H, 0, len(tpls))
		for _, t := range tpls {
			var wc int64
			var qc int64
			db.Model(&models.ShippingCarrierWeightBracket{}).Where("template_id = ?", t.ID).Count(&wc)
			db.Model(&models.ShippingCarrierQuoteSurcharge{}).Where("template_id = ?", t.ID).Count(&qc)
			out = append(out, gin.H{
				"id":               t.ID,
				"carrier":          t.Carrier,
				"service_code":     t.ServiceCode,
				"country_code":     t.CountryCode,
				"country_name":     t.CountryName,
				"currency":         t.Currency,
				"is_active":        t.IsActive,
				"weight_brackets":  wc,
				"quote_surcharges": qc,
				"created_at":       t.CreatedAt,
				"updated_at":       t.UpdatedAt,
			})
		}
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: out})
		return
	}

	query := db.Model(&models.ShippingTemplate{})
	if q != "" {
		like := "%" + q + "%"
		query = query.Where("country_code LIKE ? OR country_name LIKE ?", like, like)
	}

	var tpls []models.ShippingTemplate
	if err := query.Order("country_name ASC").Find(&tpls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to list templates", Error: err.Error()})
		return
	}

	out := make([]gin.H, 0, len(tpls))
	for _, t := range tpls {
		var wc int64
		var qc int64
		db.Model(&models.ShippingWeightBracket{}).Where("template_id = ?", t.ID).Count(&wc)
		db.Model(&models.ShippingQuoteSurcharge{}).Where("template_id = ?", t.ID).Count(&qc)
		out = append(out, gin.H{
			"id":               t.ID,
			"country_code":     t.CountryCode,
			"country_name":     t.CountryName,
			"currency":         t.Currency,
			"is_active":        t.IsActive,
			"weight_brackets":  wc,
			"quote_surcharges": qc,
			"created_at":       t.CreatedAt,
			"updated_at":       t.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: out})
}

// Admin: GET /api/v1/admin/shipping-rates/import/template
func (sc *ShippingRateController) DownloadTemplate(c *gin.Context) {
	typeParam := strings.ToLower(strings.TrimSpace(c.Query("type")))
	carrier := strings.TrimSpace(c.Query("carrier"))
	serviceCode := strings.TrimSpace(c.Query("service"))
	currency := strings.TrimSpace(c.Query("currency"))
	var (
		b   []byte
		err error
	)
	if typeParam == "carrier-zone" {
		b, err = services.GenerateCarrierZoneTemplateXLSX(services.CarrierZoneImportOptions{Carrier: carrier, ServiceCode: serviceCode, Currency: currency})
	} else {
		b, err = services.GenerateShippingTemplateXLSX_USSample()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to generate template", Error: err.Error()})
		return
	}
	filename := "shipping-template.xlsx"
	if typeParam == "carrier-zone" {
		cc := services.NormalizeCarrier(carrier)
		ss := services.NormalizeServiceCode(serviceCode)
		if cc != "" {
			filename = "shipping-" + strings.ToLower(cc)
			if ss != "" {
				filename += "-" + strings.ToLower(ss)
			}
			filename += "-zone-template.xlsx"
		} else {
			filename = "shipping-carrier-zone-template.xlsx"
		}
	}
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", b)
}

// Admin: POST /api/v1/admin/shipping-rates/import/xlsx?replace=1
func (sc *ShippingRateController) ImportXLSX(c *gin.Context) {
	replace := strings.TrimSpace(c.Query("replace")) == "1" || strings.ToLower(strings.TrimSpace(c.Query("replace"))) == "true"
	typeParam := strings.ToLower(strings.TrimSpace(c.Query("type")))
	carrier := strings.TrimSpace(c.Query("carrier"))
	serviceCode := strings.TrimSpace(c.Query("service"))
	currency := strings.TrimSpace(c.Query("currency"))

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing file", Error: err.Error()})
		return
	}
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to read file", Error: err.Error()})
		return
	}
	defer src.Close()

	db := config.GetDB()
	var (
		res services.ShippingTemplateImportResult
	)
	if typeParam == "carrier-zone" {
		res, err = services.ImportCarrierZoneTemplatesFromXLSX(c.Request.Context(), db, src, replace, services.CarrierZoneImportOptions{Carrier: carrier, ServiceCode: serviceCode, Currency: currency})
	} else {
		res, err = services.ImportShippingTemplatesFromXLSX(c.Request.Context(), db, src, replace)
	}
	if err != nil {
		msg := "Import failed"
		if len(res.Errors) > 0 {
			// surface the first few errors to the UI
			max := 3
			if len(res.Errors) < max {
				max = len(res.Errors)
			}
			msg = msg + ": " + strings.Join(res.Errors[:max], "; ")
		}
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: msg, Error: err.Error(), Data: res})
		return
	}
	// Shipping countries endpoint is cached; clear it so whitelist/template changes show immediately.
	_ = services.ClearRedisByPrefixes(c.Request.Context(), "cache:public:shipping_countries:")
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Import completed", Data: res})
}

type bulkDeleteShippingReq struct {
	All          bool     `json:"all"`
	CountryCodes []string `json:"country_codes"`
}

// Admin: POST /api/v1/admin/shipping-rates/bulk-delete
func (sc *ShippingRateController) BulkDelete(c *gin.Context) {
	typeParam := strings.ToLower(strings.TrimSpace(c.Query("type")))
	carrier := services.NormalizeCarrier(c.Query("carrier"))
	serviceCode := services.NormalizeServiceCode(c.Query("service"))
	if typeParam == "carrier" {
		var req bulkDeleteShippingReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
			return
		}
		if carrier == "" {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing carrier", Error: "missing_carrier"})
			return
		}
		db := config.GetDB()

		q := db.Model(&models.ShippingCarrierTemplate{}).Where("carrier = ?", carrier)
		if serviceCode != "" {
			q = q.Where("service_code = ?", serviceCode)
		}

		var templates []models.ShippingCarrierTemplate
		if req.All {
			if err := q.Find(&templates).Error; err != nil {
				c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load templates", Error: err.Error()})
				return
			}
		} else {
			codes := make([]string, 0, len(req.CountryCodes))
			for _, c0 := range req.CountryCodes {
				cc := services.NormalizeCountryCode(c0)
				if cc != "" {
					codes = append(codes, cc)
				}
			}
			if len(codes) == 0 {
				c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "No country codes provided", Error: "missing_country_codes"})
				return
			}
			if err := q.Where("country_code IN ?", codes).Find(&templates).Error; err != nil {
				c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load templates", Error: err.Error()})
				return
			}
		}

		deleted := 0
		err := db.Transaction(func(tx *gorm.DB) error {
			for _, t := range templates {
				_ = tx.Where("template_id = ?", t.ID).Delete(&models.ShippingCarrierWeightBracket{}).Error
				_ = tx.Where("template_id = ?", t.ID).Delete(&models.ShippingCarrierQuoteSurcharge{}).Error
				if e := tx.Delete(&models.ShippingCarrierTemplate{}, t.ID).Error; e != nil {
					return e
				}
				deleted++
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to delete", Error: err.Error()})
			return
		}
		_ = services.ClearRedisByPrefixes(c.Request.Context(), "cache:public:shipping_countries:")
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Deleted", Data: gin.H{"deleted": deleted}})
		return
	}

	var req bulkDeleteShippingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}
	db := config.GetDB()

	var templates []models.ShippingTemplate
	if req.All {
		if err := db.Find(&templates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load templates", Error: err.Error()})
			return
		}
	} else {
		codes := make([]string, 0, len(req.CountryCodes))
		for _, c0 := range req.CountryCodes {
			cc := services.NormalizeCountryCode(c0)
			if cc != "" {
				codes = append(codes, cc)
			}
		}
		if len(codes) == 0 {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "No country codes provided", Error: "missing_country_codes"})
			return
		}
		if err := db.Where("country_code IN ?", codes).Find(&templates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load templates", Error: err.Error()})
			return
		}
	}

	deleted := 0
	err := db.Transaction(func(tx *gorm.DB) error {
		for _, t := range templates {
			_ = tx.Where("template_id = ?", t.ID).Delete(&models.ShippingWeightBracket{}).Error
			_ = tx.Where("template_id = ?", t.ID).Delete(&models.ShippingQuoteSurcharge{}).Error
			if e := tx.Delete(&models.ShippingTemplate{}, t.ID).Error; e != nil {
				return e
			}
			deleted++
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to delete", Error: err.Error()})
		return
	}

	_ = services.ClearRedisByPrefixes(c.Request.Context(), "cache:public:shipping_countries:")
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Deleted", Data: gin.H{"deleted": deleted}})
}

// ========== Allowed Countries Whitelist ==========

type allowedCountryReq struct {
	CountryCode string `json:"country_code" binding:"required"`
	CountryName string `json:"country_name"`
	SortOrder   int    `json:"sort_order"`
}

// Admin: GET /api/v1/admin/shipping-rates/allowed-countries
func (sc *ShippingRateController) ListAllowedCountries(c *gin.Context) {
	db := config.GetDB()
	var list []models.ShippingAllowedCountry
	if err := db.Order("sort_order ASC, country_name ASC").Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to list allowed countries", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: list})
}

// Admin: POST /api/v1/admin/shipping-rates/allowed-countries
func (sc *ShippingRateController) AddAllowedCountry(c *gin.Context) {
	var req allowedCountryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}
	cc := services.NormalizeCountryCode(req.CountryCode)
	if cc == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid country code", Error: "invalid_country_code"})
		return
	}
	name := strings.TrimSpace(req.CountryName)
	if name == "" {
		name = cc
	}

	db := config.GetDB()
	var existing models.ShippingAllowedCountry
	if err := db.Where("country_code = ?", cc).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, models.APIResponse{Success: false, Message: "Country already in whitelist", Error: "already_exists"})
		return
	}

	entry := models.ShippingAllowedCountry{
		CountryCode: cc,
		CountryName: name,
		SortOrder:   req.SortOrder,
	}
	if err := db.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to add country", Error: err.Error()})
		return
	}
	_ = services.ClearRedisByPrefixes(c.Request.Context(), "cache:public:shipping_countries:")
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Country added to whitelist", Data: entry})
}

// Admin: DELETE /api/v1/admin/shipping-rates/allowed-countries/:code
func (sc *ShippingRateController) RemoveAllowedCountry(c *gin.Context) {
	cc := services.NormalizeCountryCode(c.Param("code"))
	if cc == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid country code", Error: "invalid_country_code"})
		return
	}
	db := config.GetDB()
	result := db.Where("country_code = ?", cc).Delete(&models.ShippingAllowedCountry{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to remove country", Error: result.Error.Error()})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Country not found in whitelist", Error: "not_found"})
		return
	}
	_ = services.ClearRedisByPrefixes(c.Request.Context(), "cache:public:shipping_countries:")
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Country removed from whitelist"})
}

type bulkAllowedCountriesReq struct {
	Countries []allowedCountryReq `json:"countries"`
}

// Admin: POST /api/v1/admin/shipping-rates/allowed-countries/bulk
func (sc *ShippingRateController) BulkSetAllowedCountries(c *gin.Context) {
	var req bulkAllowedCountriesReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}

	db := config.GetDB()
	err := db.Transaction(func(tx *gorm.DB) error {
		// Clear existing
		if e := tx.Where("1=1").Delete(&models.ShippingAllowedCountry{}).Error; e != nil {
			return e
		}
		// Insert new
		for i, r := range req.Countries {
			cc := services.NormalizeCountryCode(r.CountryCode)
			if cc == "" {
				continue
			}
			name := strings.TrimSpace(r.CountryName)
			if name == "" {
				name = cc
			}
			entry := models.ShippingAllowedCountry{
				CountryCode: cc,
				CountryName: name,
				SortOrder:   i,
			}
			if e := tx.Create(&entry).Error; e != nil {
				return e
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to update whitelist", Error: err.Error()})
		return
	}
	_ = services.ClearRedisByPrefixes(c.Request.Context(), "cache:public:shipping_countries:")
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Whitelist updated", Data: gin.H{"count": len(req.Countries)}})
}
