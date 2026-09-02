package services

import "testing"

func TestNormalizeSocialMediaURL(t *testing.T) {
	tests := []struct {
		name     string
		platform string
		raw      string
		want     string
		wantErr  bool
	}{
		{name: "blank disables platform", platform: "X", raw: "  ", want: ""},
		{name: "x profile", platform: "X", raw: "https://x.com/vibocnc", want: "https://x.com/vibocnc"},
		{name: "legacy twitter profile", platform: "X", raw: "https://twitter.com/vibocnc", want: "https://twitter.com/vibocnc"},
		{name: "linkedin subdomain", platform: "LinkedIn", raw: "https://www.linkedin.com/company/vibocnc", want: "https://www.linkedin.com/company/vibocnc"},
		{name: "wrong platform domain", platform: "Instagram", raw: "https://example.com/vibocnc", wantErr: true},
		{name: "javascript scheme", platform: "Facebook", raw: "javascript:alert(1)", wantErr: true},
		{name: "domain suffix attack", platform: "Facebook", raw: "https://facebook.com.attacker.test/vibocnc", wantErr: true},
		{name: "credentials rejected", platform: "LinkedIn", raw: "https://user:pass@linkedin.com/company/vibocnc", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NormalizeSocialMediaURL(tt.platform, tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected an error, got %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}
