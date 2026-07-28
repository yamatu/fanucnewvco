package controllers

import (
	"net/http"

	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
)

type SocialMediaSettingController struct {
	service *services.SocialMediaSettingService
}

func NewSocialMediaSettingController(service *services.SocialMediaSettingService) *SocialMediaSettingController {
	return &SocialMediaSettingController{service: service}
}

func (c *SocialMediaSettingController) GetPublic(ctx *gin.Context) {
	c.get(ctx, "Social media settings retrieved")
}

func (c *SocialMediaSettingController) GetAdmin(ctx *gin.Context) {
	c.get(ctx, "Social media settings retrieved")
}

func (c *SocialMediaSettingController) get(ctx *gin.Context, message string) {
	setting, err := c.service.GetOrCreate()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to load social media settings",
			Error:   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: message,
		Data:    setting,
	})
}

func (c *SocialMediaSettingController) Update(ctx *gin.Context) {
	var req models.SocialMediaSettingRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid social media settings",
			Error:   err.Error(),
		})
		return
	}

	setting, err := c.service.Update(req)
	if err != nil {
		status := http.StatusInternalServerError
		if services.IsSocialMediaValidationError(err) {
			status = http.StatusBadRequest
		}
		ctx.JSON(status, models.APIResponse{
			Success: false,
			Message: "Failed to save social media settings",
			Error:   err.Error(),
		})
		return
	}

	services.InvalidatePublicCaches(ctx.Request.Context(), "social-media:update", []string{"/"})
	services.TriggerNextRevalidate(nil, []string{"/"}, false)

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Social media settings saved",
		Data:    setting,
	})
}
