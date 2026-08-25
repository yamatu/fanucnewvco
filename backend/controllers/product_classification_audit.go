package controllers

import (
	"net/http"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
)

type classificationAuditRequest struct {
	Limit int `json:"limit"`
}

// AuditProductClassifications reports every product whose classification needs
// rework: uncategorized, verifiably misplaced, unverified on a root category,
// kept inactive by an earlier unresolved run, or failed during AI SEO. The
// scan is read-only; the rework job endpoint consumes the same selection.
func (poc *ProductOptimizationController) AuditProductClassifications(c *gin.Context) {
	var request classificationAuditRequest
	if err := c.ShouldBindJSON(&request); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid audit request", Error: err.Error()})
		return
	}
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database connection failed"})
		return
	}
	result, err := services.AuditProductClassifications(db, request.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Classification audit failed", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Classification audit completed", Data: result})
}
