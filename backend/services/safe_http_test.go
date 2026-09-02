package services

import (
	"net"
	"testing"
)

func TestValidatePublicHTTPURLRejectsPrivateTargets(t *testing.T) {
	t.Parallel()

	blocked := []string{
		"http://localhost/image.jpg",
		"http://127.0.0.1/image.jpg",
		"http://10.0.0.1/image.jpg",
		"http://169.254.169.254/latest/meta-data/",
		"http://[::1]/image.jpg",
		"https://user:password@example.com/image.jpg",
		"https://8.8.8.8:8443/image.jpg",
	}
	for _, raw := range blocked {
		raw := raw
		t.Run(raw, func(t *testing.T) {
			t.Parallel()
			if _, err := validatePublicHTTPURL(raw); err == nil {
				t.Fatalf("validatePublicHTTPURL(%q) accepted a blocked target", raw)
			}
		})
	}
}

func TestValidatePublicHTTPURLAcceptsPublicIP(t *testing.T) {
	t.Parallel()

	if _, err := validatePublicHTTPURL("https://8.8.8.8/image.jpg"); err != nil {
		t.Fatalf("expected public IP URL to be accepted: %v", err)
	}
}

func TestIsPublicOutboundIP(t *testing.T) {
	t.Parallel()

	tests := []struct {
		ip   string
		want bool
	}{
		{ip: "8.8.8.8", want: true},
		{ip: "1.1.1.1", want: true},
		{ip: "127.0.0.1", want: false},
		{ip: "10.0.0.1", want: false},
		{ip: "100.64.0.1", want: false},
		{ip: "169.254.169.254", want: false},
		{ip: "::1", want: false},
	}
	for _, test := range tests {
		if got := isPublicOutboundIP(net.ParseIP(test.ip)); got != test.want {
			t.Errorf("isPublicOutboundIP(%q) = %v, want %v", test.ip, got, test.want)
		}
	}
}
