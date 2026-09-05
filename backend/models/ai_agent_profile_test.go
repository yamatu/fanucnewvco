package models

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestAIAgentProfileResponseNeverSerializesEncryptedKey(t *testing.T) {
	activeID := uint(7)
	profile := AIAgentProfile{ID: activeID, Name: "Primary", APIKeyEnc: "v1:top-secret-ciphertext", Model: "custom/model"}
	payload, err := json.Marshal(profile.ToResponse(&activeID))
	if err != nil {
		t.Fatal(err)
	}
	serialized := string(payload)
	if strings.Contains(serialized, profile.APIKeyEnc) || strings.Contains(serialized, "api_key_enc") {
		t.Fatalf("profile response leaked encrypted key material: %s", serialized)
	}
	if !strings.Contains(serialized, `"has_api_key":true`) || !strings.Contains(serialized, `"is_active":true`) {
		t.Fatalf("safe credential/active flags are missing: %s", serialized)
	}
}
