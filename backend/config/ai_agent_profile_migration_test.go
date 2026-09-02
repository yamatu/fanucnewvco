package config

import (
	"fanuc-backend/models"
	"testing"
)

func TestLegacyAIAgentProfileFromSettingPreservesProviderAndCiphertext(t *testing.T) {
	setting := models.AIAgentSetting{
		BaseURL:               "https://provider.example/v1",
		APIKeyEnc:             "v1:encrypted-with-original-nonce",
		Model:                 "vendor/custom-model",
		APIMode:               "reasoning_chat",
		ReasoningEffort:       "provider_level_7",
		TimeoutSeconds:        123,
		SEOJobConcurrency:     14,
		DefaultProductPrice:   999,
		DefaultWarrantyPeriod: "24 months",
	}
	profile := legacyAIAgentProfileFromSetting(setting)
	if profile.Name != "Default" || profile.BaseURL != setting.BaseURL || profile.Model != setting.Model ||
		profile.APIMode != setting.APIMode || profile.ReasoningEffort != setting.ReasoningEffort || profile.TimeoutSeconds != setting.TimeoutSeconds {
		t.Fatalf("legacy provider fields were not preserved: %#v", profile)
	}
	if profile.APIKeyEnc != setting.APIKeyEnc {
		t.Fatalf("migration must copy ciphertext verbatim: got %q want %q", profile.APIKeyEnc, setting.APIKeyEnc)
	}
}
