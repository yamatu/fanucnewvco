package controllers

import (
	"net/http"
	"strings"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
	resend "github.com/resend/resend-go/v3"
)

type ResendWebhookController struct{}

func (rc *ResendWebhookController) clientOrError(c *gin.Context) (*resend.Client, bool) {
	db := config.GetDB()
	s, err := services.GetOrCreateEmailSetting(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load settings", Error: err.Error()})
		return nil, false
	}
	apiKey, err := services.GetDecryptedResendAPIKey(s)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Resend API key not configured", Error: err.Error()})
		return nil, false
	}
	client := resend.NewClient(apiKey)
	return client, true
}

// Admin: GET /api/v1/admin/email/resend/webhooks
func (rc *ResendWebhookController) List(c *gin.Context) {
	client, ok := rc.clientOrError(c)
	if !ok {
		return
	}
	whs, err := client.Webhooks.List()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to list webhooks", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: whs})
}

// Admin: GET /api/v1/admin/email/resend/webhooks/:id
func (rc *ResendWebhookController) Get(c *gin.Context) {
	client, ok := rc.clientOrError(c)
	if !ok {
		return
	}
	id := c.Param("id")
	wh, err := client.Webhooks.Get(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to get webhook", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: wh})
}

type createWebhookReq struct {
	Endpoint string   `json:"endpoint" binding:"required"`
	Events   []string `json:"events" binding:"required"`
}

// Admin: POST /api/v1/admin/email/resend/webhooks
func (rc *ResendWebhookController) Create(c *gin.Context) {
	client, ok := rc.clientOrError(c)
	if !ok {
		return
	}
	var req createWebhookReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}
	params := &resend.CreateWebhookRequest{Endpoint: strings.TrimSpace(req.Endpoint), Events: req.Events}
	wh, err := client.Webhooks.Create(params)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to create webhook", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Created", Data: wh})
}

type updateWebhookReq struct {
	Endpoint *string  `json:"endpoint"`
	Events   []string `json:"events"`
	Status   *string  `json:"status"`
}

// Admin: PUT /api/v1/admin/email/resend/webhooks/:id
func (rc *ResendWebhookController) Update(c *gin.Context) {
	client, ok := rc.clientOrError(c)
	if !ok {
		return
	}
	id := c.Param("id")
	var req updateWebhookReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}
	params := &resend.UpdateWebhookRequest{Events: req.Events}
	if req.Endpoint != nil {
		e := strings.TrimSpace(*req.Endpoint)
		params.Endpoint = &e
	}
	if req.Status != nil {
		st := strings.TrimSpace(*req.Status)
		params.Status = &st
	}
	wh, err := client.Webhooks.Update(id, params)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to update webhook", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Updated", Data: wh})
}

// Admin: DELETE /api/v1/admin/email/resend/webhooks/:id
func (rc *ResendWebhookController) Remove(c *gin.Context) {
	client, ok := rc.clientOrError(c)
	if !ok {
		return
	}
	id := c.Param("id")
	wh, err := client.Webhooks.Remove(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to delete webhook", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Deleted", Data: wh})
}
