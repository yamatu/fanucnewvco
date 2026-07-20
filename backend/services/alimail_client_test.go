package services

import "testing"

func TestNormalizeAliMailEndpointRejectsUnsafeTargets(t *testing.T) {
	t.Parallel()

	blocked := []string{
		"http://8.8.8.8",
		"https://127.0.0.1",
		"https://169.254.169.254/latest/meta-data",
		"https://8.8.8.8/api",
		"https://8.8.8.8?redirect=internal",
	}
	for _, endpoint := range blocked {
		endpoint := endpoint
		t.Run(endpoint, func(t *testing.T) {
			t.Parallel()
			if _, err := normalizeAliMailEndpoint(endpoint); err == nil {
				t.Fatalf("normalizeAliMailEndpoint(%q) accepted an unsafe endpoint", endpoint)
			}
		})
	}
}

func TestNormalizeAliMailEndpointAcceptsPublicHTTPSOrigin(t *testing.T) {
	t.Parallel()

	got, err := normalizeAliMailEndpoint("https://8.8.8.8/")
	if err != nil {
		t.Fatalf("expected public HTTPS origin to be accepted: %v", err)
	}
	if got != "https://8.8.8.8" {
		t.Fatalf("normalized endpoint = %q, want %q", got, "https://8.8.8.8")
	}
}
