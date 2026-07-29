package services

import (
	"strings"
	"testing"
	"time"

	"fanuc-backend/models"
)

func TestBuildContactNotificationEmail(t *testing.T) {
	message := models.ContactMessage{
		Name:        "Jane & Sons",
		Email:       "jane@example.com",
		Subject:     "A06B <quote>",
		Message:     "Please quote <10 units>",
		InquiryType: "quote",
		CreatedAt:   time.Date(2026, time.July, 29, 12, 0, 0, 0, time.UTC),
	}

	subject, text, html := BuildContactNotificationEmail("https://example.com/", message)
	if subject != "New contact message: A06B <quote>" {
		t.Fatalf("unexpected subject: %q", subject)
	}
	if !strings.Contains(text, "Admin: https://example.com/admin/contacts") {
		t.Fatalf("admin link missing from text: %q", text)
	}
	if strings.Contains(html, "Please quote <10 units>") || !strings.Contains(html, "Please quote &lt;10 units&gt;") {
		t.Fatalf("message is not safely escaped: %q", html)
	}
}

func TestContactNotificationRecipientsFallsBackToSender(t *testing.T) {
	recipients, err := contactNotificationRecipients(&models.EmailSetting{FromEmail: "Owner@Example.com"})
	if err != nil {
		t.Fatalf("contactNotificationRecipients returned error: %v", err)
	}
	if len(recipients) != 1 || recipients[0] != "owner@example.com" {
		t.Fatalf("unexpected recipients: %#v", recipients)
	}
}

func TestContactNotificationRecipientsPrefersDedicatedRecipients(t *testing.T) {
	recipients, err := contactNotificationRecipients(&models.EmailSetting{
		ContactNotificationEmails: "contact@example.com",
		OrderNotificationEmails:   "orders@example.com",
		FromEmail:                 "owner@example.com",
	})
	if err != nil {
		t.Fatalf("contactNotificationRecipients returned error: %v", err)
	}
	if len(recipients) != 1 || recipients[0] != "contact@example.com" {
		t.Fatalf("unexpected recipients: %#v", recipients)
	}
}
