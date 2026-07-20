package services

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strings"
	"time"
)

var blockedOutboundRanges = []netip.Prefix{
	netip.MustParsePrefix("100.64.0.0/10"),   // Carrier-grade NAT
	netip.MustParsePrefix("192.0.0.0/24"),    // IETF protocol assignments
	netip.MustParsePrefix("192.0.2.0/24"),    // TEST-NET-1
	netip.MustParsePrefix("198.18.0.0/15"),   // Benchmarking
	netip.MustParsePrefix("198.51.100.0/24"), // TEST-NET-2
	netip.MustParsePrefix("203.0.113.0/24"),  // TEST-NET-3
	netip.MustParsePrefix("2001:db8::/32"),   // IPv6 documentation
}

func isPublicOutboundIP(ip net.IP) bool {
	addr, ok := netip.AddrFromSlice(ip)
	if !ok {
		return false
	}
	addr = addr.Unmap()
	if !addr.IsGlobalUnicast() || addr.IsPrivate() || addr.IsLoopback() ||
		addr.IsLinkLocalUnicast() || addr.IsUnspecified() || addr.IsMulticast() {
		return false
	}
	for _, blocked := range blockedOutboundRanges {
		if blocked.Contains(addr) {
			return false
		}
	}
	return true
}

func validatePublicHTTPURL(raw string) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed == nil || parsed.Hostname() == "" {
		return nil, fmt.Errorf("invalid outbound URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("unsupported outbound URL scheme")
	}
	if parsed.User != nil {
		return nil, fmt.Errorf("outbound URL userinfo is not allowed")
	}
	if port := parsed.Port(); port != "" && port != "80" && port != "443" {
		return nil, fmt.Errorf("outbound URL port is not allowed")
	}

	hostname := strings.TrimSuffix(strings.ToLower(parsed.Hostname()), ".")
	if hostname == "localhost" || strings.HasSuffix(hostname, ".localhost") ||
		hostname == "local" || strings.HasSuffix(hostname, ".local") ||
		strings.HasSuffix(hostname, ".internal") {
		return nil, fmt.Errorf("private outbound hostname is not allowed")
	}

	if ip := net.ParseIP(hostname); ip != nil {
		if !isPublicOutboundIP(ip) {
			return nil, fmt.Errorf("private outbound address is not allowed")
		}
		return parsed, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	ips, err := net.DefaultResolver.LookupIP(ctx, "ip", hostname)
	if err != nil || len(ips) == 0 {
		return nil, fmt.Errorf("outbound hostname could not be resolved")
	}
	for _, ip := range ips {
		if !isPublicOutboundIP(ip) {
			return nil, fmt.Errorf("outbound hostname resolves to a private address")
		}
	}
	return parsed, nil
}

func publicDialContext(ctx context.Context, network, address string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return nil, err
	}
	ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
	if err != nil {
		return nil, err
	}
	for _, ip := range ips {
		if !isPublicOutboundIP(ip) {
			return nil, fmt.Errorf("outbound hostname resolved to a private address")
		}
	}
	if len(ips) == 0 {
		return nil, fmt.Errorf("outbound hostname has no usable address")
	}
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].String(), port))
}

func newPublicHTTPClient(timeout time.Duration) *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	transport.DialContext = publicDialContext
	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
		CheckRedirect: func(req *http.Request, _ []*http.Request) error {
			if _, err := validatePublicHTTPURL(req.URL.String()); err != nil {
				return err
			}
			return nil
		},
	}
}
