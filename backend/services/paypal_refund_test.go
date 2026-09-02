package services

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPayPalRefundClientAuthenticatesAndRefundsCapture(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/oauth2/token", func(w http.ResponseWriter, r *http.Request) {
		user, password, ok := r.BasicAuth()
		if !ok || user != "client" || password != "secret" {
			t.Fatalf("unexpected basic auth: %q %q", user, password)
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"access_token":"token"}`)
	})
	mux.HandleFunc("/v2/payments/captures/CAPTURE-1/refund", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token" || r.Header.Get("PayPal-Request-Id") != "refund-1" {
			t.Fatalf("unexpected refund headers")
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		fmt.Fprint(w, `{"id":"REFUND-1","status":"COMPLETED"}`)
	})
	mux.HandleFunc("/v2/payments/refunds/REFUND-1", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.Header.Get("Authorization") != "Bearer token" {
			t.Fatalf("unexpected refund status request")
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"id":"REFUND-1","status":"PENDING"}`)
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	client := &PayPalRefundClient{BaseURL: server.URL, ClientID: "client", ClientSecret: "secret", HTTPClient: server.Client()}
	result, err := client.RefundCapture(context.Background(), "CAPTURE-1", 12.5, "USD", "refund-1")
	if err != nil {
		t.Fatalf("RefundCapture() error = %v", err)
	}
	if result.ID != "REFUND-1" || result.Status != "completed" {
		t.Fatalf("unexpected result: %#v", result)
	}
	status, err := client.GetRefund(context.Background(), "REFUND-1")
	if err != nil {
		t.Fatalf("GetRefund() error = %v", err)
	}
	if status.ID != "REFUND-1" || status.Status != "pending" {
		t.Fatalf("unexpected status result: %#v", status)
	}
}
