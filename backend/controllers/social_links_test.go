package controllers

import "testing"

func TestNormalizeSocialURL(t *testing.T) {
	tests := []struct {
		name     string
		platform string
		input    string
		want     string
		wantErr  bool
	}{
		{name: "empty is allowed", platform: "facebook", input: "  ", want: ""},
		{name: "x profile", platform: "x", input: " https://x.com/vcocnc#profile ", want: "https://x.com/vcocnc"},
		{name: "legacy twitter profile", platform: "x", input: "https://twitter.com/vcocnc", want: "https://twitter.com/vcocnc"},
		{name: "facebook subdomain", platform: "facebook", input: "https://www.facebook.com/vcocnc", want: "https://www.facebook.com/vcocnc"},
		{name: "instagram profile", platform: "instagram", input: "https://instagram.com/vcocnc/", want: "https://instagram.com/vcocnc/"},
		{name: "linkedin company", platform: "linkedin", input: "https://www.linkedin.com/company/vcocnc", want: "https://www.linkedin.com/company/vcocnc"},
		{name: "missing scheme", platform: "x", input: "x.com/vcocnc", wantErr: true},
		{name: "wrong platform domain", platform: "facebook", input: "https://example.com/vcocnc", wantErr: true},
		{name: "credentials are rejected", platform: "instagram", input: "https://user@instagram.com/vcocnc", wantErr: true},
		{name: "custom port is rejected", platform: "linkedin", input: "https://linkedin.com:8443/company/vcocnc", wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := normalizeSocialURL(test.platform, test.input)
			if test.wantErr {
				if err == nil {
					t.Fatalf("expected an error, got %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != test.want {
				t.Fatalf("got %q, want %q", got, test.want)
			}
		})
	}
}
