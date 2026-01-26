package controllers

import (
	"fmt"
	"net/http"
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
	list, err := services.ListActiveShippingCountries(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to fetch countries", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: list})
}

// Public: GET /api/v1/public/shipping/quote?country=US&weight_kg=12.3
func (sc *ShippingRateController) PublicQuote(c *gin.Context) {
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
	q, err := services.CalculateShippingQuote(db, cc, weight)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
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

	// Attach counts
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
	b, err := services.GenerateShippingTemplateXLSX_USSample()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to generate template", Error: err.Error()})
		return
	}
	filename := "shipping-template-template.xlsx"
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", b)
}

// Admin: POST /api/v1/admin/shipping-rates/import/xlsx?replace=1
func (sc *ShippingRateController) ImportXLSX(c *gin.Context) {
	replace := strings.TrimSpace(c.Query("replace")) == "1" || strings.ToLower(strings.TrimSpace(c.Query("replace"))) == "true"

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
	res, err := services.ImportShippingTemplatesFromXLSX(c.Request.Context(), db, src, replace)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Import failed", Error: err.Error(), Data: res})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Import completed", Data: res})
}

type bulkDeleteShippingReq struct {
	All          bool     `json:"all"`
	CountryCodes []string `json:"country_codes"`
}

// Admin: POST /api/v1/admin/shipping-rates/bulk-delete
func (sc *ShippingRateController) BulkDelete(c *gin.Context) {
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

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Deleted", Data: gin.H{"deleted": deleted}})
}
