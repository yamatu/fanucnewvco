package controllers

import (
	"fmt"
	"net/http"
	"strings"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
)

type EmailController struct{}

// Public: GET /api/v1/public/email/config
func (ec *EmailController) GetPublicConfig(c *gin.Context) {
	db := config.GetDB()
	s, err := services.GetOrCreateEmailSetting(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load email settings", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: s.ToPublicConfig()})
}

type sendCodeRequest struct {
	Email   string `json:"email" binding:"required,email"`
	Purpose string `json:"purpose" binding:"required"` // register | reset
}

// Public: POST /api/v1/public/email/send-code
func (ec *EmailController) SendCode(c *gin.Context) {
	var req sendCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}

	p := strings.ToLower(strings.TrimSpace(req.Purpose))
	if p != string(services.PurposeRegister) && p != string(services.PurposeReset) {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid purpose", Error: "purpose must be register or reset"})
		return
	}

	db := config.GetDB()
	if err := services.CreateAndSendVerificationCode(db, req.Email, services.VerificationPurpose(p)); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to send code", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Verification code sent"})
}

// Admin settings

type EmailSettingsResponse struct {
	models.EmailSetting
	HasSMTPPassword bool `json:"has_smtp_password"`
}

// Admin: GET /api/v1/admin/email/settings
func (ec *EmailController) GetSettings(c *gin.Context) {
	db := config.GetDB()
	s, err := services.GetOrCreateEmailSetting(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load email settings", Error: err.Error()})
		return
	}
	hasPass := strings.TrimSpace(s.SMTPPassword) != ""
	// Do not return the password.
	s.SMTPPassword = ""
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: EmailSettingsResponse{EmailSetting: *s, HasSMTPPassword: hasPass}})
}

type updateEmailSettingsRequest struct {
	Enabled             *bool   `json:"enabled"`
	Provider            *string `json:"provider"`
	FromName            *string `json:"from_name"`
	FromEmail           *string `json:"from_email"`
	ReplyTo             *string `json:"reply_to"`
	SMTPHost            *string `json:"smtp_host"`
	SMTPPort            *int    `json:"smtp_port"`
	SMTPUsername        *string `json:"smtp_username"`
	SMTPPassword        *string `json:"smtp_password"`
	SMTPTLSMode         *string `json:"smtp_tls_mode"`
	VerificationEnabled *bool   `json:"verification_enabled"`
	MarketingEnabled    *bool   `json:"marketing_enabled"`
	CodeExpiryMinutes   *int    `json:"code_expiry_minutes"`
	CodeResendSeconds   *int    `json:"code_resend_seconds"`
}

// Admin: PUT /api/v1/admin/email/settings
func (ec *EmailController) UpdateSettings(c *gin.Context) {
	var req updateEmailSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}

	db := config.GetDB()
	s, err := services.GetOrCreateEmailSetting(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load email settings", Error: err.Error()})
		return
	}

	if req.Enabled != nil {
		s.Enabled = *req.Enabled
	}
	if req.Provider != nil {
		p := strings.ToLower(strings.TrimSpace(*req.Provider))
		if p == "" {
			p = "smtp"
		}
		s.Provider = p
	}
	if req.FromName != nil {
		s.FromName = strings.TrimSpace(*req.FromName)
	}
	if req.FromEmail != nil {
		s.FromEmail = strings.TrimSpace(*req.FromEmail)
	}
	if req.ReplyTo != nil {
		s.ReplyTo = strings.TrimSpace(*req.ReplyTo)
	}
	if req.SMTPHost != nil {
		s.SMTPHost = strings.TrimSpace(*req.SMTPHost)
	}
	if req.SMTPPort != nil {
		s.SMTPPort = *req.SMTPPort
	}
	if req.SMTPUsername != nil {
		s.SMTPUsername = strings.TrimSpace(*req.SMTPUsername)
	}
	if req.SMTPTLSMode != nil {
		m := strings.ToLower(strings.TrimSpace(*req.SMTPTLSMode))
		if m == "" {
			m = "starttls"
		}
		s.SMTPTLSMode = m
	}
	if req.SMTPPassword != nil {
		// If empty string, keep existing (unless allow_clear=1)
		if *req.SMTPPassword == "" {
			if c.Query("allow_clear") == "1" {
				s.SMTPPassword = ""
			}
		} else {
			if err := services.UpdateSMTPPassword(db, s, *req.SMTPPassword); err != nil {
				c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to save password", Error: err.Error()})
				return
			}
		}
	}
	if req.VerificationEnabled != nil {
		s.VerificationEnabled = *req.VerificationEnabled
	}
	if req.MarketingEnabled != nil {
		s.MarketingEnabled = *req.MarketingEnabled
	}
	if req.CodeExpiryMinutes != nil {
		s.CodeExpiryMinutes = *req.CodeExpiryMinutes
	}
	if req.CodeResendSeconds != nil {
		s.CodeResendSeconds = *req.CodeResendSeconds
	}

	if err := db.Save(s).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to save email settings", Error: err.Error()})
		return
	}

	hasPass := strings.TrimSpace(s.SMTPPassword) != ""
	s.SMTPPassword = ""
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Saved", Data: EmailSettingsResponse{EmailSetting: *s, HasSMTPPassword: hasPass}})
}

type sendTestEmailRequest struct {
	To string `json:"to" binding:"required,email"`
}

// Admin: POST /api/v1/admin/email/test
func (ec *EmailController) SendTest(c *gin.Context) {
	var req sendTestEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}

	db := config.GetDB()
	err := services.SendEmail(db, services.EmailSendOptions{
		To:      req.To,
		Subject: "Test email from Vcocnc",
		Text:    "This is a test email from Vcocnc admin panel.",
		HTML:    "<p>This is a <b>test email</b> from Vcocnc admin panel.</p>",
		Headers: map[string]string{"X-Entity-Ref-ID": "test-email"},
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to send", Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Sent"})
}

type broadcastRequest struct {
	Subject string `json:"subject" binding:"required"`
	HTML    string `json:"html" binding:"required"`
	Text    string `json:"text"`
	TestTo  string `json:"test_to"` // optional email
	Limit   int    `json:"limit"`
}

// Admin: POST /api/v1/admin/email/broadcast
func (ec *EmailController) Broadcast(c *gin.Context) {
	var req broadcastRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}

	db := config.GetDB()
	s, err := services.GetOrCreateEmailSetting(db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load settings", Error: err.Error()})
		return
	}
	if !s.Enabled || !s.MarketingEnabled {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Email marketing is disabled"})
		return
	}

	if req.TestTo != "" {
		// test send only
		err := services.SendEmail(db, services.EmailSendOptions{
			To:      req.TestTo,
			Subject: req.Subject,
			Text:    req.Text,
			HTML:    req.HTML,
			Headers: map[string]string{"X-Entity-Ref-ID": "marketing-test"},
		})
		if err != nil {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to send", Error: err.Error()})
			return
		}
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Test email sent"})
		return
	}

	var customers []models.Customer
	q := db.Model(&models.Customer{}).Where("is_active = ?", true)
	if err := q.Order("id ASC").Find(&customers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to load customers", Error: err.Error()})
		return
	}
	limit := req.Limit
	if limit <= 0 || limit > len(customers) {
		limit = len(customers)
	}

	sent := 0
	failed := 0
	for i := 0; i < limit; i++ {
		cust := customers[i]
		to := cust.Email
		if strings.TrimSpace(to) == "" {
			continue
		}

		html := strings.ReplaceAll(req.HTML, "{{full_name}}", cust.FullName)
		html = strings.ReplaceAll(html, "{{email}}", cust.Email)
		text := strings.ReplaceAll(req.Text, "{{full_name}}", cust.FullName)
		text = strings.ReplaceAll(text, "{{email}}", cust.Email)

		headers := map[string]string{
			"X-Entity-Ref-ID": fmt.Sprintf("marketing:%d", cust.ID),
		}
		if s.ReplyTo != "" {
			headers["List-Unsubscribe"] = fmt.Sprintf("<mailto:%s?subject=unsubscribe>", s.ReplyTo)
		}

		if err := services.SendEmail(db, services.EmailSendOptions{To: to, Subject: req.Subject, Text: text, HTML: html, Headers: headers}); err != nil {
			failed++
			continue
		}
		sent++
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Broadcast finished", Data: gin.H{"sent": sent, "failed": failed, "total": limit}})
}
