package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type cloudflareAPIResponse struct {
	Success bool `json:"success"`
	Errors  []struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"errors"`
	Messages []any `json:"messages"`
	Result   any   `json:"result"`
}

func (r cloudflareAPIResponse) errorString() string {
	if len(r.Errors) == 0 {
		return ""
	}
	parts := make([]string, 0, len(r.Errors))
	for _, e := range r.Errors {
		if e.Code != 0 {
			parts = append(parts, fmt.Sprintf("%d: %s", e.Code, e.Message))
		} else {
			parts = append(parts, e.Message)
		}
	}
	return strings.Join(parts, "; ")
}

type CloudflareClient struct {
	HTTP *http.Client
}

func NewCloudflareClient() *CloudflareClient {
	return &CloudflareClient{
		HTTP: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *CloudflareClient) PurgeEverything(ctx context.Context, email, apiKey, zoneID string) error {
	body := map[string]any{"purge_everything": true}
	return c.purge(ctx, email, apiKey, zoneID, body)
}

func (c *CloudflareClient) PurgeURLs(ctx context.Context, email, apiKey, zoneID string, urls []string) error {
	clean := make([]string, 0, len(urls))
	seen := map[string]bool{}
	for _, u := range urls {
		u = strings.TrimSpace(u)
		if u == "" {
			continue
		}
		if !seen[u] {
			seen[u] = true
			clean = append(clean, u)
		}
	}
	if len(clean) == 0 {
		return errors.New("no urls to purge")
	}
	body := map[string]any{"files": clean}
	return c.purge(ctx, email, apiKey, zoneID, body)
}

func (c *CloudflareClient) TestZone(ctx context.Context, email, apiKey, zoneID string) error {
	if strings.TrimSpace(zoneID) == "" {
		return errors.New("missing zone_id")
	}
	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s", strings.TrimSpace(zoneID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	setAuthHeaders(req, email, apiKey)

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var out cloudflareAPIResponse
	_ = json.NewDecoder(resp.Body).Decode(&out)

	if resp.StatusCode >= 400 || !out.Success {
		msg := out.errorString()
		if msg == "" {
			msg = resp.Status
		}
		return fmt.Errorf("cloudflare test failed: %s", msg)
	}
	return nil
}

func (c *CloudflareClient) purge(ctx context.Context, email, apiKey, zoneID string, payload any) error {
	email = strings.TrimSpace(email)
	apiKey = strings.TrimSpace(apiKey)
	zoneID = strings.TrimSpace(zoneID)
	if email == "" || apiKey == "" || zoneID == "" {
		return errors.New("missing email/api_key/zone_id")
	}

	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/purge_cache", zoneID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return err
	}
	setAuthHeaders(req, email, apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var out cloudflareAPIResponse
	_ = json.NewDecoder(resp.Body).Decode(&out)

	if resp.StatusCode >= 400 || !out.Success {
		msg := out.errorString()
		if msg == "" {
			msg = resp.Status
		}
		return fmt.Errorf("cloudflare purge failed: %s", msg)
	}
	return nil
}

func setAuthHeaders(req *http.Request, email, apiKey string) {
	// Global API Key auth
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("X-Auth-Key", apiKey)
	req.Header.Set("Accept", "application/json")
}
