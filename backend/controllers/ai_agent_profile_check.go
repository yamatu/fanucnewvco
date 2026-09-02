package controllers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/utils"

	"github.com/gin-gonic/gin"
)

const aiAgentTestMaxTimeoutSeconds = 60

type aiAgentProfileTestRequest struct {
	ProfileID       uint   `json:"profile_id"`
	BaseURL         string `json:"base_url"`
	APIKey          string `json:"api_key"`
	Model           string `json:"model"`
	APIMode         string `json:"api_mode"`
	ReasoningEffort string `json:"reasoning_effort"`
	TimeoutSeconds  int    `json:"timeout_seconds"`
}

type aiAgentProfileTestResponse struct {
	OK        bool   `json:"ok"`
	LatencyMS int64  `json:"latency_ms"`
	Model     string `json:"model"`
	Provider  string `json:"provider"`
	Reply     string `json:"reply,omitempty"`
	Error     string `json:"error,omitempty"`
}

// TestProfileConnection performs one tiny chat completion against the supplied
// provider settings so administrators can validate a profile before saving or
// activating it. A blank API key falls back to the key already stored on the
// referenced profile; the stored secret itself never reaches the browser.
func (ac *AIAgentController) TestProfileConnection(c *gin.Context) {
	var req aiAgentProfileTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid AI test request", Error: err.Error()})
		return
	}

	baseURL, err := normalizeAIAgentBaseURL(req.BaseURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid AI test request", Error: err.Error()})
		return
	}
	model, err := normalizeAIAgentModel(req.Model)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid AI test request", Error: err.Error()})
		return
	}
	apiMode, err := normalizeAIAgentAPIMode(req.APIMode)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid AI test request", Error: err.Error()})
		return
	}
	effort, err := normalizeAIAgentReasoningEffort(req.ReasoningEffort)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid AI test request", Error: err.Error()})
		return
	}
	apiKey, err := normalizeAIAgentAPIKey(req.APIKey)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid AI test request", Error: err.Error()})
		return
	}

	if apiKey == "" && req.ProfileID > 0 {
		var profile models.AIAgentProfile
		if dbErr := config.GetDB().First(&profile, req.ProfileID).Error; dbErr != nil {
			c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "AI profile not found"})
			return
		}
		if strings.TrimSpace(profile.APIKeyEnc) == "" {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "This profile has no saved API key; enter one to test"})
			return
		}
		// A saved key may only be exercised against its own provider host, so a
		// tampered base URL cannot exfiltrate the credential to another server.
		if aiAgentProviderOrigin(baseURL) != aiAgentProviderOrigin(profile.BaseURL) {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Save the profile first: the saved key can only be tested against its own provider host"})
			return
		}
		decrypted, decErr := utils.DecryptSecret(profile.APIKeyEnc)
		if decErr != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Could not decrypt the saved API key", Error: decErr.Error()})
			return
		}
		apiKey = decrypted
	}
	if apiKey == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Provide an API key or reference a profile with a saved key"})
		return
	}

	timeout := req.TimeoutSeconds
	if timeout < 15 {
		timeout = 15
	}
	if timeout > aiAgentTestMaxTimeoutSeconds {
		timeout = aiAgentTestMaxTimeoutSeconds
	}
	setting := &models.AIAgentSetting{
		BaseURL:         baseURL,
		Model:           model,
		APIMode:         apiMode,
		ReasoningEffort: effort,
		TimeoutSeconds:  timeout,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), time.Duration(timeout)*time.Second)
	defer cancel()
	messages := []aiChatMessage{
		{Role: "system", Content: "You are a connectivity check. Reply with the single word OK."},
		{Role: "user", Content: "ping"},
	}
	started := time.Now()
	reply, err := requestAIAgentCompletion(ctx, setting, apiKey, messages, 512)
	latency := time.Since(started).Milliseconds()

	result := aiAgentProfileTestResponse{
		LatencyMS: latency,
		Model:     model,
		Provider:  aiAgentProviderOrigin(baseURL),
	}
	if err != nil {
		result.Error = truncateRunes(err.Error(), 500)
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "AI connection test failed", Data: result})
		return
	}
	result.OK = true
	result.Reply = truncateRunes(strings.TrimSpace(reply), 200)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "AI connection test succeeded", Data: result})
}
