package controllers

import (
	"fmt"
	"net/http"
	"strings"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ShippingRateController struct{}

// Public: GET /api/v1/public/shipping/rates
func (sc *ShippingRateController) PublicList(c *gin.Context) {
	db := config.GetDB()
	rates, err := services.ListActiveShippingRates(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to fetch shipping rates", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: rates})
}

// Public: GET /api/v1/public/shipping/rate/:country
func (sc *ShippingRateController) PublicGet(c *gin.Context) {
	cc := strings.TrimSpace(c.Param("country"))
	if cc == "" {
		cc = strings.TrimSpace(c.Query("country"))
	}
	if cc == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing country code", Error: "missing_country"})
		return
	}
	db := config.GetDB()
	fee, currency, err := services.GetShippingFee(db, cc)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Shipping rate not found", Error: "not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to fetch shipping rate", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: gin.H{"country_code": services.NormalizeCountryCode(cc), "fee": fee, "currency": currency}})
}

// Admin: GET /api/v1/admin/shipping-rates
func (sc *ShippingRateController) AdminList(c *gin.Context) {
	db := config.GetDB()
	q := strings.TrimSpace(c.Query("q"))
	query := db.Model(&models.ShippingRate{})
	if q != "" {
		like := "%" + q + "%"
		query = query.Where("country_code LIKE ? OR country_name LIKE ?", like, like)
	}
	var rates []models.ShippingRate
	if err := query.Order("country_name ASC").Find(&rates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to list rates", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: rates})
}

type shippingRateUpsertReq struct {
	CountryCode string  `json:"country_code" binding:"required"`
	CountryName string  `json:"country_name" binding:"required"`
	Fee         float64 `json:"fee" binding:"min=0"`
	Currency    string  `json:"currency"`
	IsActive    *bool   `json:"is_active"`
}

// Admin: POST /api/v1/admin/shipping-rates
func (sc *ShippingRateController) AdminCreate(c *gin.Context) {
	var req shippingRateUpsertReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}
	db := config.GetDB()
	cc := services.NormalizeCountryCode(req.CountryCode)
	cur := strings.ToUpper(strings.TrimSpace(req.Currency))
	if cur == "" {
		cur = "USD"
	}
	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}

	r := models.ShippingRate{CountryCode: cc, CountryName: strings.TrimSpace(req.CountryName), Fee: req.Fee, Currency: cur, IsActive: active}
	if err := db.Create(&r).Error; err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to create rate", Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: "Created", Data: r})
}

// Admin: PUT /api/v1/admin/shipping-rates/:id
func (sc *ShippingRateController) AdminUpdate(c *gin.Context) {
	id := c.Param("id")
	var rate models.ShippingRate
	db := config.GetDB()
	if err := db.First(&rate, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Rate not found", Error: "not_found"})
		return
	}
	var req shippingRateUpsertReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}
	updates := map[string]any{}
	updates["country_code"] = services.NormalizeCountryCode(req.CountryCode)
	updates["country_name"] = strings.TrimSpace(req.CountryName)
	updates["fee"] = req.Fee
	cur := strings.ToUpper(strings.TrimSpace(req.Currency))
	if cur == "" {
		cur = "USD"
	}
	updates["currency"] = cur
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if err := db.Model(&models.ShippingRate{}).Where("id = ?", rate.ID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to update rate", Error: err.Error()})
		return
	}
	db.First(&rate, rate.ID)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Updated", Data: rate})
}

// Admin: DELETE /api/v1/admin/shipping-rates/:id
func (sc *ShippingRateController) AdminDelete(c *gin.Context) {
	id := c.Param("id")
	db := config.GetDB()
	if err := db.Delete(&models.ShippingRate{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to delete rate", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Deleted"})
}

// Admin: GET /api/v1/admin/shipping-rates/import/template
func (sc *ShippingRateController) DownloadTemplate(c *gin.Context) {
	b, err := services.GenerateShippingRateTemplateXLSX()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to generate template", Error: err.Error()})
		return
	}
	filename := "shipping-rates-template.xlsx"
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", b)
}

// Admin: POST /api/v1/admin/shipping-rates/import/xlsx
func (sc *ShippingRateController) ImportXLSX(c *gin.Context) {
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
	res, err := services.ImportShippingRatesFromXLSX(c.Request.Context(), db, src)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Import failed", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Import completed", Data: res})
}
