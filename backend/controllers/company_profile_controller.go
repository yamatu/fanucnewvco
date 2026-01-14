package controllers

import (
	"net/http"
	"strconv"

	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
)

type CompanyProfileController struct {
	service *services.CompanyProfileService
}

func NewCompanyProfileController(service *services.CompanyProfileService) *CompanyProfileController {
	return &CompanyProfileController{
		service: service,
	}
}

// GetCompanyProfile godoc
// @Summary Get company profile
// @Description Get the current company profile
// @Tags company-profile
// @Accept json
// @Produce json
// @Success 200 {object} models.CompanyProfileResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/company-profile [get]
func (c *CompanyProfileController) GetCompanyProfile(ctx *gin.Context) {
	profile, err := c.service.GetCompanyProfile()
	if err != nil {
		ctx.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Company profile not found",
			Error:   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Company profile retrieved successfully",
		Data:    profile.ToResponse(),
	})
}

// GetCompanyProfileAdmin godoc
// @Summary Get company profile (Admin)
// @Description Get the current company profile for admin
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.CompanyProfileResponse
// @Failure 401 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/admin/company-profile [get]
func (c *CompanyProfileController) GetCompanyProfileAdmin(ctx *gin.Context) {
	profile, err := c.service.GetCompanyProfile()
	if err != nil {
		ctx.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Company profile not found",
			Error:   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Company profile retrieved successfully",
		Data:    profile.ToResponse(),
	})
}

// CreateCompanyProfile godoc
// @Summary Create company profile
// @Description Create a new company profile
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param profile body models.CompanyProfileRequest true "Company Profile"
// @Success 201 {object} models.CompanyProfileResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/admin/company-profile [post]
func (c *CompanyProfileController) CreateCompanyProfile(ctx *gin.Context) {
	var req models.CompanyProfileRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	profile := req.ToCompanyProfile()
	createdProfile, err := c.service.CreateCompanyProfile(profile)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to create company profile",
			Error:   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Company profile created successfully",
		Data:    createdProfile.ToResponse(),
	})
}

// UpdateCompanyProfile godoc
// @Summary Update company profile
// @Description Update an existing company profile
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Profile ID"
// @Param profile body models.CompanyProfileRequest true "Company Profile"
// @Success 200 {object} models.CompanyProfileResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/admin/company-profile/{id} [put]
func (c *CompanyProfileController) UpdateCompanyProfile(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid profile ID",
			Error:   "Profile ID must be a valid number",
		})
		return
	}

	var req models.CompanyProfileRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	profile := req.ToCompanyProfile()
	profile.ID = uint(id)

	updatedProfile, err := c.service.UpdateCompanyProfile(profile)
	if err != nil {
		if err.Error() == "company profile not found" {
			ctx.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Message: "Company profile not found",
				Error:   err.Error(),
			})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to update company profile",
			Error:   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Company profile updated successfully",
		Data:    updatedProfile.ToResponse(),
	})
}

// DeleteCompanyProfile godoc
// @Summary Delete company profile
// @Description Delete a company profile
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Profile ID"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/admin/company-profile/{id} [delete]
func (c *CompanyProfileController) DeleteCompanyProfile(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid profile ID",
			Error:   "Profile ID must be a valid number",
		})
		return
	}

	err = c.service.DeleteCompanyProfile(uint(id))
	if err != nil {
		if err.Error() == "company profile not found" {
			ctx.JSON(http.StatusNotFound, models.APIResponse{
				Success: false,
				Message: "Company profile not found",
				Error:   err.Error(),
			})
			return
		}
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to delete company profile",
			Error:   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Company profile deleted successfully",
	})
}

// UpsertCompanyProfile godoc
// @Summary Create or update company profile
// @Description Create a new company profile or update existing one (only one profile allowed)
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param profile body models.CompanyProfileRequest true "Company Profile"
// @Success 200 {object} models.CompanyProfileResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/admin/company-profile [post]
func (c *CompanyProfileController) UpsertCompanyProfile(ctx *gin.Context) {
	var req models.CompanyProfileRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	profile := req.ToCompanyProfile()
	upsertedProfile, err := c.service.UpsertCompanyProfile(profile)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Message: "Failed to save company profile",
			Error:   err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Company profile saved successfully",
		Data:    upsertedProfile.ToResponse(),
	})
}
