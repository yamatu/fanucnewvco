package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type ResendClient struct {
	apiKey string
	http   *http.Client
	base   string
}

func NewResendClient(apiKey string) *ResendClient {
	return &ResendClient{
		apiKey: strings.TrimSpace(apiKey),
		http:   &http.Client{Timeout: 30 * time.Second},
		base:   "https://api.resend.com",
	}
}

type ResendSendEmailRequest struct {
	From    string            `json:"from"`
	To      []string          `json:"to"`
	Subject string            `json:"subject"`
	ReplyTo string            `json:"reply_to,omitempty"`
	HTML    string            `json:"html,omitempty"`
	Text    string            `json:"text,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
}

type ResendSendEmailResponse struct {
	ID string `json:"id"`
}

type ResendCreateWebhookRequest struct {
	Endpoint string   `json:"endpoint"`
	Events   []string `json:"events"`
}

type ResendUpdateWebhookRequest struct {
	Endpoint *string  `json:"endpoint,omitempty"`
	Events   []string `json:"events,omitempty"`
	Status   *string  `json:"status,omitempty"`
}

// Resend webhook objects are passed through as map to avoid SDK dependency.

func (c *ResendClient) do(method, path string, body any, out any) error {
	if c.apiKey == "" {
		return errors.New("missing resend api key")
	}
	var r io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		r = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, c.base+path, r)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// Resend returns JSON errors; return body as message.
		msg := strings.TrimSpace(string(data))
		if msg == "" {
			msg = resp.Status
		}
		return fmt.Errorf("resend api error: %s", msg)
	}

	if out != nil {
		if err := json.Unmarshal(data, out); err != nil {
			return err
		}
	}
	return nil
}

func (c *ResendClient) SendEmail(req ResendSendEmailRequest) (*ResendSendEmailResponse, error) {
	var out ResendSendEmailResponse
	if err := c.do(http.MethodPost, "/emails", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *ResendClient) WebhooksList() (any, error) {
	var out any
	if err := c.do(http.MethodGet, "/webhooks", nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *ResendClient) WebhooksGet(id string) (any, error) {
	var out any
	if err := c.do(http.MethodGet, "/webhooks/"+id, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *ResendClient) WebhooksCreate(req ResendCreateWebhookRequest) (any, error) {
	var out any
	if err := c.do(http.MethodPost, "/webhooks", req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *ResendClient) WebhooksUpdate(id string, req ResendUpdateWebhookRequest) (any, error) {
	var out any
	if err := c.do(http.MethodPatch, "/webhooks/"+id, req, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *ResendClient) WebhooksRemove(id string) (any, error) {
	var out any
	if err := c.do(http.MethodDelete, "/webhooks/"+id, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}
