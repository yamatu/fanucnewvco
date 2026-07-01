package services

import (
	"strings"
	"testing"
	"time"

	"fanuc-backend/models"
)

func TestBuildContactNotificationEmailSanitizesContent(t *testing.T) {
	msg := models.ContactMessage{
		ID:          12,
		Name:        "Alice\r\nBcc: attacker@example.com",
		Email:       "alice@example.com",
		Phone:       "+1 555",
		Company:     "<Acme>",
		Subject:     "Need quote\nInjected",
		Message:     "Please quote <script>alert(1)</script>",
		InquiryType: "quote",
		IPAddress:   "203.0.113.10",
		UserAgent:   "UnitTest",
		CreatedAt:   time.Date(2026, 7, 1, 8, 0, 0, 0, time.UTC),
	}

	subject, text, html := BuildContactNotificationEmail("https://www.vcocncspare.com", msg)
	if strings.ContainsAny(subject, "\r\n") {
		t.Fatalf("subject contains CR/LF: %q", subject)
	}
	if !strings.Contains(subject, "Alice Bcc: attacker@example.com") {
		t.Fatalf("subject did not preserve cleaned name: %q", subject)
	}
	if !strings.Contains(text, "Admin: https://www.vcocncspare.com/admin/contacts") {
		t.Fatalf("text missing admin URL: %s", text)
	}
	if strings.Contains(html, "<script>") {
		t.Fatalf("html did not escape message content: %s", html)
	}
	if !strings.Contains(html, "&lt;script&gt;alert(1)&lt;/script&gt;") {
		t.Fatalf("html missing escaped message content: %s", html)
	}
}

func TestContactNotificationRecipientsFallbacks(t *testing.T) {
	setting := &models.EmailSetting{
		ContactNotificationEmails: "owner@example.com; sales@example.com owner@example.com",
		OrderNotificationEmails:   "orders@example.com",
		FromEmail:                 "from@example.com",
	}

	recipients, err := contactNotificationRecipients(setting)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got, want := strings.Join(recipients, ","), "owner@example.com,sales@example.com"; got != want {
		t.Fatalf("recipients = %q, want %q", got, want)
	}

	setting.ContactNotificationEmails = ""
	recipients, err = contactNotificationRecipients(setting)
	if err != nil {
		t.Fatalf("unexpected order fallback error: %v", err)
	}
	if got, want := strings.Join(recipients, ","), "orders@example.com"; got != want {
		t.Fatalf("order fallback recipients = %q, want %q", got, want)
	}

	setting.OrderNotificationEmails = ""
	recipients, err = contactNotificationRecipients(setting)
	if err != nil {
		t.Fatalf("unexpected from fallback error: %v", err)
	}
	if got, want := strings.Join(recipients, ","), "from@example.com"; got != want {
		t.Fatalf("from fallback recipients = %q, want %q", got, want)
	}
}
