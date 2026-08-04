package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"fanuc-backend/models"
	"fanuc-backend/utils"

	"gorm.io/gorm"
)

type PayPalRefundClient struct {
	BaseURL      string
	ClientID     string
	ClientSecret string
	HTTPClient   *http.Client
}

type PayPalRefundResult struct {
	ID      string `json:"id"`
	Status  string `json:"status"`
	RawJSON string `json:"-"`
}

type paypalAccessTokenResponse struct {
	AccessToken string `json:"access_token"`
}

func NewPayPalRefundClientFromSettings(db *gorm.DB) (*PayPalRefundClient, error) {
	if db == nil {
		return nil, errors.New("db is nil")
	}
	var setting models.PayPalSetting
	if err := db.First(&setting, 1).Error; err != nil {
		return nil, fmt.Errorf("load PayPal settings: %w", err)
	}
	clientID := setting.ClientIDSandbox
	secretEnc := setting.ClientSecretSandboxEnc
	baseURL := "https://api-m.sandbox.paypal.com"
	if setting.Mode == "live" {
		clientID = setting.ClientIDLive
		secretEnc = setting.ClientSecretLiveEnc
		baseURL = "https://api-m.paypal.com"
	}
	if strings.TrimSpace(clientID) == "" || strings.TrimSpace(secretEnc) == "" {
		return nil, fmt.Errorf("PayPal %s Client ID and Secret are required", setting.Mode)
	}
	secret, err := utils.DecryptSecret(secretEnc)
	if err != nil {
		return nil, fmt.Errorf("decrypt PayPal Client Secret: %w", err)
	}
	return &PayPalRefundClient{
		BaseURL:      baseURL,
		ClientID:     strings.TrimSpace(clientID),
		ClientSecret: strings.TrimSpace(secret),
		HTTPClient:   &http.Client{Timeout: 30 * time.Second},
	}, nil
}

func (client *PayPalRefundClient) RefundCapture(ctx context.Context, captureID string, amount float64, currency, requestID string) (PayPalRefundResult, error) {
	if client == nil || strings.TrimSpace(client.BaseURL) == "" || strings.TrimSpace(client.ClientID) == "" || strings.TrimSpace(client.ClientSecret) == "" {
		return PayPalRefundResult{}, errors.New("PayPal refund client is not configured")
	}
	if strings.TrimSpace(captureID) == "" || amount <= 0 {
		return PayPalRefundResult{}, errors.New("capture ID and positive refund amount are required")
	}
	accessToken, err := client.accessToken(ctx)
	if err != nil {
		return PayPalRefundResult{}, err
	}
	payload := map[string]any{
		"amount": map[string]string{
			"value":         fmt.Sprintf("%.2f", amount),
			"currency_code": strings.ToUpper(strings.TrimSpace(currency)),
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return PayPalRefundResult{}, err
	}
	endpoint := strings.TrimRight(client.BaseURL, "/") + "/v2/payments/captures/" + url.PathEscape(strings.TrimSpace(captureID)) + "/refund"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return PayPalRefundResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	if strings.TrimSpace(requestID) != "" {
		req.Header.Set("PayPal-Request-Id", strings.TrimSpace(requestID))
	}
	resp, err := client.httpClient().Do(req)
	if err != nil {
		return PayPalRefundResult{}, fmt.Errorf("call PayPal refund API: %w", err)
	}
	defer resp.Body.Close()
	raw, readErr := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if readErr != nil {
		return PayPalRefundResult{}, readErr
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return PayPalRefundResult{RawJSON: string(raw)}, fmt.Errorf("PayPal refund failed (%d): %s", resp.StatusCode, paypalErrorMessage(raw))
	}
	var decoded struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return PayPalRefundResult{RawJSON: string(raw)}, fmt.Errorf("decode PayPal refund response: %w", err)
	}
	if strings.TrimSpace(decoded.ID) == "" {
		return PayPalRefundResult{RawJSON: string(raw)}, errors.New("PayPal refund response did not include a refund ID")
	}
	return PayPalRefundResult{ID: decoded.ID, Status: strings.ToLower(decoded.Status), RawJSON: string(raw)}, nil
}

// GetRefund retrieves the provider state for a previously submitted refund.
// PayPal can return PENDING for asynchronous risk/bank review, so admins can
// reconcile that state without submitting a second refund.
func (client *PayPalRefundClient) GetRefund(ctx context.Context, refundID string) (PayPalRefundResult, error) {
	if client == nil || strings.TrimSpace(client.BaseURL) == "" || strings.TrimSpace(client.ClientID) == "" || strings.TrimSpace(client.ClientSecret) == "" {
		return PayPalRefundResult{}, errors.New("PayPal refund client is not configured")
	}
	if strings.TrimSpace(refundID) == "" {
		return PayPalRefundResult{}, errors.New("refund ID is required")
	}
	accessToken, err := client.accessToken(ctx)
	if err != nil {
		return PayPalRefundResult{}, err
	}
	endpoint := strings.TrimRight(client.BaseURL, "/") + "/v2/payments/refunds/" + url.PathEscape(strings.TrimSpace(refundID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return PayPalRefundResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := client.httpClient().Do(req)
	if err != nil {
		return PayPalRefundResult{}, fmt.Errorf("call PayPal refund status API: %w", err)
	}
	defer resp.Body.Close()
	raw, readErr := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if readErr != nil {
		return PayPalRefundResult{}, readErr
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return PayPalRefundResult{RawJSON: string(raw)}, fmt.Errorf("PayPal refund status failed (%d): %s", resp.StatusCode, paypalErrorMessage(raw))
	}
	var decoded struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return PayPalRefundResult{RawJSON: string(raw)}, fmt.Errorf("decode PayPal refund status: %w", err)
	}
	if strings.TrimSpace(decoded.ID) == "" {
		decoded.ID = strings.TrimSpace(refundID)
	}
	return PayPalRefundResult{ID: decoded.ID, Status: strings.ToLower(decoded.Status), RawJSON: string(raw)}, nil
}

func (client *PayPalRefundClient) accessToken(ctx context.Context) (string, error) {
	form := url.Values{"grant_type": {"client_credentials"}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(client.BaseURL, "/")+"/v1/oauth2/token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(client.ClientID, client.ClientSecret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := client.httpClient().Do(req)
	if err != nil {
		return "", fmt.Errorf("request PayPal access token: %w", err)
	}
	defer resp.Body.Close()
	raw, readErr := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if readErr != nil {
		return "", readErr
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("PayPal authentication failed (%d): %s", resp.StatusCode, paypalErrorMessage(raw))
	}
	var token paypalAccessTokenResponse
	if err := json.Unmarshal(raw, &token); err != nil || strings.TrimSpace(token.AccessToken) == "" {
		return "", errors.New("PayPal authentication response did not include an access token")
	}
	return token.AccessToken, nil
}

func (client *PayPalRefundClient) httpClient() *http.Client {
	if client.HTTPClient != nil {
		return client.HTTPClient
	}
	return &http.Client{Timeout: 30 * time.Second}
}

func paypalErrorMessage(raw []byte) string {
	var payload struct {
		Message string `json:"message"`
		Details []struct {
			Description string `json:"description"`
		} `json:"details"`
	}
	if json.Unmarshal(raw, &payload) == nil {
		if len(payload.Details) > 0 && payload.Details[0].Description != "" {
			return payload.Details[0].Description
		}
		if payload.Message != "" {
			return payload.Message
		}
	}
	return strings.TrimSpace(string(raw))
}
