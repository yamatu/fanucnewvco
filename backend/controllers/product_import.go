package controllers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
)

// Admin: GET /api/v1/admin/products/import/template
func (pc *ProductController) DownloadImportTemplate(c *gin.Context) {
	brand := services.NormalizeBrandKey(strings.TrimSpace(c.Query("brand")))
	b, err := services.GenerateProductImportTemplateXLSX(brand)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to generate template", Error: err.Error()})
		return
	}

	filenameBrand := strings.ToLower(brand)
	if filenameBrand == "" {
		filenameBrand = "generic"
	}
	filename := fmt.Sprintf("product-import-template-%s.xlsx", filenameBrand)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", b)
}

// Admin: POST /api/v1/admin/products/import/csv
// Accepts quote exports with 品牌/型号/价格/交期 (or English aliases).
func (pc *ProductController) ImportProductsQuoteCSV(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 25<<20)
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing CSV file", Error: err.Error()})
		return
	}
	if file.Size <= 0 || file.Size > 25<<20 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "CSV file must be between 1 byte and 25 MB", Error: "invalid_file_size"})
		return
	}
	if !strings.EqualFold(filepath.Ext(file.Filename), ".csv") {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Only .csv files are supported", Error: "invalid_file_type"})
		return
	}
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to read CSV file", Error: err.Error()})
		return
	}
	defer src.Close()

	task, err := services.StartProductQuoteCSVImportTask(c.Request.Context(), config.GetDB(), src, file.Filename)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "CSV import failed", Error: err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, models.APIResponse{Success: true, Message: "CSV import started", Data: task})
}

// Admin: POST /api/v1/admin/products/import/xlsx
// multipart form fields:
// - file: .xlsx
// - brand: optional
// - overwrite: true/false (optional)
// - create_missing: true/false (optional, default true)
func (pc *ProductController) ImportProductsXLSX(c *gin.Context) {
	brand := services.NormalizeBrandKey(strings.TrimSpace(c.PostForm("brand")))
	if brand == "" {
		brand = services.NormalizeBrandKey(strings.TrimSpace(c.Query("brand")))
	}
	overwrite := strings.ToLower(strings.TrimSpace(c.PostForm("overwrite"))) == "true"
	createMissing := true
	if v := strings.TrimSpace(c.PostForm("create_missing")); v != "" {
		createMissing = strings.ToLower(v) == "true"
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing file", Error: err.Error()})
		return
	}
	if file.Size <= 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Empty file", Error: "empty_file"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to read file", Error: err.Error()})
		return
	}
	defer src.Close()

	db := config.GetDB()
	task, err := services.StartProductImportTask(c.Request.Context(), db, src, file.Filename, services.ProductImportOptions{
		Brand:         brand,
		Overwrite:     overwrite,
		CreateMissing: createMissing,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Import failed", Error: err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, models.APIResponse{Success: true, Message: "Import started", Data: task})
}

// Admin: GET /api/v1/admin/products/import/xlsx/tasks/:id
func (pc *ProductController) GetProductImportTask(c *gin.Context) {
	taskID := strings.TrimSpace(c.Param("id"))
	if taskID == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing task id", Error: "missing_task_id"})
		return
	}

	task, ok := services.GetProductImportTaskSnapshot(taskID)
	if !ok {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Import task not found", Error: "task_not_found"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Import task status", Data: task})
}
