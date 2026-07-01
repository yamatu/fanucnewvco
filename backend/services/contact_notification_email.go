package services

import (
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"fanuc-backend/models"

	"gorm.io/gorm"
)

func BuildContactNotificationEmail(siteURL string, message models.ContactMessage) (subject, text, html string) {
	name := fallbackStr(message.Name, "Unknown customer")
	customerEmail := fallbackStr(message.Email, "-")
	msgSubject := fallbackStr(message.Subject, "(no subject)")
	inquiryType := fallbackStr(message.InquiryType, "general")

	createdAt := ""
	if !message.CreatedAt.IsZero() {
		createdAt = message.CreatedAt.UTC().Format(time.RFC3339)
	}

	adminPage := ""
	base := strings.TrimSpace(siteURL)
	if base != "" {
		adminPage = strings.TrimRight(base, "/") + "/admin/contacts"
	}

	subject = "New contact message from " + cleanEmailSubjectPart(name)
	if cleanEmailSubjectPart(msgSubject) != "" {
		subject += ": " + cleanEmailSubjectPart(msgSubject)
	}
	subject = truncateRunes(subject, 180)

	text = fmt.Sprintf(
		"New contact message\n\nName: %s\nEmail: %s\nPhone: %s\nCompany: %s\nInquiry type: %s\nSubject: %s\nReceived at: %s\n\nMessage:\n%s\n\nAdmin: %s\nIP: %s\nUser-Agent: %s\n",
		name,
		customerEmail,
		fallbackStr(message.Phone, "-"),
		fallbackStr(message.Company, "-"),
		inquiryType,
		msgSubject,
		fallbackStr(createdAt, "-"),
		fallbackStr(message.Message, "-"),
		adminPage,
		fallbackStr(message.IPAddress, "-"),
		fallbackStr(message.UserAgent, "-"),
	)

	adminBtn := ""
	if adminPage != "" {
		adminBtn = fmt.Sprintf("<p style=\"margin:16px 0 0 0\"><a href=\"%s\" style=\"display:inline-block;background:#111827;color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:10px 12px;border-radius:10px\">Open contact messages</a></p>", escapeAttr(adminPage))
	}

	html = "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;line-height:1.6;color:#111827\">" +
		"<div style=\"padding:18px 20px;background:#f59e0b;border-radius:14px 14px 0 0;color:#111827;\">" +
		"<div style=\"font-size:18px;font-weight:800\">Vcocnc Spare Parts</div>" +
		"<div style=\"font-size:13px;opacity:0.9;margin-top:4px\">New contact message</div>" +
		"</div>" +
		"<div style=\"border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:18px 20px;background:#fff\">" +
		fmt.Sprintf("<p style=\"margin:0 0 14px 0\"><b>%s</b> sent a contact message.</p>", escapeHTML(name)) +
		"<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;border-collapse:separate;border-spacing:0 8px\">" +
		fmt.Sprintf("<tr><td style=\"width:150px;color:#6b7280;font-size:13px\">Name</td><td style=\"font-size:14px\">%s</td></tr>", escapeHTML(name)) +
		fmt.Sprintf("<tr><td style=\"width:150px;color:#6b7280;font-size:13px\">Email</td><td style=\"font-size:14px\">%s</td></tr>", escapeHTML(customerEmail)) +
		fmt.Sprintf("<tr><td style=\"width:150px;color:#6b7280;font-size:13px\">Phone</td><td style=\"font-size:14px\">%s</td></tr>", escapeHTML(fallbackStr(message.Phone, "-"))) +
		fmt.Sprintf("<tr><td style=\"width:150px;color:#6b7280;font-size:13px\">Company</td><td style=\"font-size:14px\">%s</td></tr>", escapeHTML(fallbackStr(message.Company, "-"))) +
		fmt.Sprintf("<tr><td style=\"width:150px;color:#6b7280;font-size:13px\">Inquiry type</td><td style=\"font-size:14px\">%s</td></tr>", escapeHTML(inquiryType)) +
		fmt.Sprintf("<tr><td style=\"width:150px;color:#6b7280;font-size:13px\">Subject</td><td style=\"font-size:14px;font-weight:700\">%s</td></tr>", escapeHTML(msgSubject)) +
		fmt.Sprintf("<tr><td style=\"width:150px;color:#6b7280;font-size:13px\">Received at</td><td style=\"font-size:14px\">%s</td></tr>", escapeHTML(fallbackStr(createdAt, "-"))) +
		"</table>" +
		"<div style=\"margin-top:16px\">" +
		"<div style=\"font-size:13px;font-weight:800;color:#111827;margin:0 0 8px 0\">Message</div>" +
		fmt.Sprintf("<div style=\"font-size:14px;white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#f9fafb\">%s</div>", escapeHTML(fallbackStr(message.Message, "-"))) +
		"</div>" +
		adminBtn +
		"<div style=\"margin-top:16px;font-size:12px;color:#6b7280\">" +
		fmt.Sprintf("IP: %s<br/>User-Agent: %s", escapeHTML(fallbackStr(message.IPAddress, "-")), escapeHTML(fallbackStr(message.UserAgent, "-"))) +
		"</div>" +
		"</div>" +
		"</div>"

	return subject, text, html
}

func NotifyAdminContactMessage(db *gorm.DB, siteURL string, messageID uint) error {
	s, err := GetOrCreateEmailSetting(db)
	if err != nil {
		return err
	}
	if !s.Enabled || !s.ContactNotificationsEnabled {
		return nil
	}

	recipients, err := contactNotificationRecipients(s)
	if err != nil {
		return err
	}
	if len(recipients) == 0 {
		return errors.New("contact notification emails not configured")
	}

	var message models.ContactMessage
	if err := db.First(&message, messageID).Error; err != nil {
		return err
	}

	subj, txt, html := BuildContactNotificationEmail(siteURL, message)
	replyTo := validReplyTo(message.Email)
	headerID := fmt.Sprintf("contact:%d", message.ID)

	fails := 0
	var lastErr error
	for _, to := range recipients {
		if e := SendEmail(db, EmailSendOptions{
			To:      to,
			Subject: subj,
			Text:    txt,
			HTML:    html,
			ReplyTo: replyTo,
			Headers: map[string]string{"X-Entity-Ref-ID": headerID},
		}); e != nil {
			fails++
			lastErr = e
		}
	}
	if fails > 0 {
		return fmt.Errorf("contact notification: failed to send to %d recipient(s): %v", fails, lastErr)
	}
	return nil
}

func contactNotificationRecipients(s *models.EmailSetting) ([]string, error) {
	if s == nil {
		return nil, errors.New("missing email settings")
	}

	_, recipients, err := NormalizeEmailRecipients(s.ContactNotificationEmails)
	if err != nil {
		return nil, err
	}
	if len(recipients) > 0 {
		return recipients, nil
	}

	_, recipients, err = NormalizeEmailRecipients(s.OrderNotificationEmails)
	if err != nil {
		return nil, err
	}
	if len(recipients) > 0 {
		return recipients, nil
	}

	_, recipients, err = NormalizeEmailRecipients(s.FromEmail)
	if err != nil {
		return nil, err
	}
	return recipients, nil
}

func validReplyTo(email string) string {
	email = strings.TrimSpace(email)
	if email == "" {
		return ""
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr == nil {
		return ""
	}
	return strings.TrimSpace(addr.Address)
}

func cleanEmailSubjectPart(s string) string {
	s = strings.NewReplacer("\r", " ", "\n", " ", "\t", " ").Replace(strings.TrimSpace(s))
	return strings.Join(strings.Fields(s), " ")
}

func truncateRunes(s string, max int) string {
	if max <= 0 {
		return ""
	}
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	if max <= 1 {
		return string(r[:max])
	}
	return string(r[:max-1]) + "..."
}
