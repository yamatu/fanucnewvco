package models

import "time"

// AIAgentSetting is the single persisted configuration row for the catalog AI.
// APIKeyEnc is encrypted at rest and intentionally excluded from every JSON response.
type AIAgentSetting struct {
	ID uint `json:"id" gorm:"primaryKey"`

	Enabled         bool   `json:"enabled" gorm:"default:false"`
	BaseURL         string `json:"base_url" gorm:"size:500;default:'https://api.openai.com/v1'"`
	APIKeyEnc       string `json:"-" gorm:"type:text"`
	Model           string `json:"model" gorm:"size:120;default:'gpt-5.6-terra'"`
	ReasoningEffort string `json:"reasoning_effort" gorm:"size:16;default:'medium'"`
	TimeoutSeconds  int    `json:"timeout_seconds" gorm:"default:75"`
	// SEOJobConcurrency limits parallel product requests made by one AI SEO job.
	// It is deliberately capped by the controller so a large candidate job cannot
	// exhaust an OpenAI-compatible provider's rate limit.
	SEOJobConcurrency int `json:"seo_job_concurrency" gorm:"default:2"`
	// SEOCandidateLimit is the persisted safety ceiling for automatic candidate
	// selection. Administrators can lower it, but never raise it above 30,000.
	SEOCandidateLimit int `json:"seo_candidate_limit" gorm:"default:30000"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// AIAgentSettingResponse is safe for the browser: the encrypted secret never leaves Go.
type AIAgentSettingResponse struct {
	Enabled           bool      `json:"enabled"`
	BaseURL           string    `json:"base_url"`
	HasAPIKey         bool      `json:"has_api_key"`
	Model             string    `json:"model"`
	ReasoningEffort   string    `json:"reasoning_effort"`
	TimeoutSeconds    int       `json:"timeout_seconds"`
	SEOJobConcurrency int       `json:"seo_job_concurrency"`
	SEOCandidateLimit int       `json:"seo_candidate_limit"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (s *AIAgentSetting) ToResponse() AIAgentSettingResponse {
	return AIAgentSettingResponse{
		Enabled:           s.Enabled,
		BaseURL:           s.BaseURL,
		HasAPIKey:         s.APIKeyEnc != "",
		Model:             s.Model,
		ReasoningEffort:   s.ReasoningEffort,
		TimeoutSeconds:    s.TimeoutSeconds,
		SEOJobConcurrency: s.SEOJobConcurrency,
		SEOCandidateLimit: s.SEOCandidateLimit,
		UpdatedAt:         s.UpdatedAt,
	}
}
