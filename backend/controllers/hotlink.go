package controllers

import (
	"net/http"
	"strings"

	"fanuc-backend/config"
	"fanuc-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type HotlinkController struct{}

type updateHotlinkRequest struct {
	Enabled           *bool   `json:"enabled"`
	AllowedHosts      *string `json:"allowed_hosts"`
	AllowEmptyReferer *bool   `json:"allow_empty_referer"`
	AllowSameHost     *bool   `json:"allow_same_host"`
}

func (hc *HotlinkController) GetSettings(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	var s models.HotlinkProtectionSetting
	if err := db.First(&s, 1).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			s = models.HotlinkProtectionSetting{ID: 1, Enabled: false, AllowEmptyReferer: true, AllowSameHost: true}
			_ = db.Create(&s).Error
		} else {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load settings", Error: err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: s.ToResponse()})
}

func (hc *HotlinkController) UpdateSettings(c *gin.Context) {
	var req updateHotlinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	var s models.HotlinkProtectionSetting
	if err := db.First(&s, 1).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			s = models.HotlinkProtectionSetting{ID: 1, Enabled: false, AllowEmptyReferer: true, AllowSameHost: true}
			if e := db.Create(&s).Error; e != nil {
				c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to init settings", Error: e.Error()})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load settings", Error: err.Error()})
			return
		}
	}

	if req.Enabled != nil {
		s.Enabled = *req.Enabled
	}
	if req.AllowedHosts != nil {
		s.AllowedHosts = strings.TrimSpace(*req.AllowedHosts)
	}
	if req.AllowEmptyReferer != nil {
		s.AllowEmptyReferer = *req.AllowEmptyReferer
	}
	if req.AllowSameHost != nil {
		s.AllowSameHost = *req.AllowSameHost
	}

	if err := db.Save(&s).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to save settings", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Saved", Data: s.ToResponse()})
}
