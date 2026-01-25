package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"fanuc-backend/models"

	"golang.org/x/crypto/bcrypt"
	"gopkg.in/gomail.v2"
	"gorm.io/gorm"
)

const (
	encPrefix = "enc:"
)

func getSettingsEncryptionKey() []byte {
	k := strings.TrimSpace(os.Getenv("SETTINGS_ENCRYPTION_KEY"))
	if k == "" {
		return nil
	}
	sum := sha256.Sum256([]byte(k))
	return sum[:]
}

func encryptString(plain string) (string, error) {
	key := getSettingsEncryptionKey()
	if len(key) == 0 {
		return plain, nil
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nil, nonce, []byte(plain), nil)
	payload := append(nonce, ciphertext...)
	return encPrefix + base64.StdEncoding.EncodeToString(payload), nil
}

func decryptString(val string) (string, error) {
	if !strings.HasPrefix(val, encPrefix) {
		return val, nil
	}
	key := getSettingsEncryptionKey()
	if len(key) == 0 {
		return "", errors.New("SETTINGS_ENCRYPTION_KEY is not set")
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(val, encPrefix))
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", errors.New("invalid encrypted payload")
	}
	nonce := raw[:gcm.NonceSize()]
	ciphertext := raw[gcm.NonceSize():]
	plain, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

func GetOrCreateEmailSetting(db *gorm.DB) (*models.EmailSetting, error) {
	var s models.EmailSetting
	if err := db.First(&s, 1).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s = models.EmailSetting{
				ID:                  1,
				Enabled:             false,
				Provider:            "smtp",
				SMTPTLSMode:         "starttls",
				SMTPPort:            587,
				FromName:            "Vcocnc",
				CodeExpiryMinutes:   10,
				CodeResendSeconds:   60,
				VerificationEnabled: false,
				MarketingEnabled:    false,
			}
			if e := db.Create(&s).Error; e != nil {
				return nil, e
			}
		} else {
			return nil, err
		}
	}
	return &s, nil
}

type EmailSendOptions struct {
	To      string
	Subject string
	Text    string
	HTML    string
	Headers map[string]string
}

func SendEmail(db *gorm.DB, opts EmailSendOptions) error {
	s, err := GetOrCreateEmailSetting(db)
	if err != nil {
		return err
	}
	if !s.Enabled {
		return errors.New("email is disabled")
	}
	if strings.ToLower(s.Provider) != "smtp" {
		return fmt.Errorf("unsupported email provider: %s", s.Provider)
	}
	if s.SMTPHost == "" || s.SMTPPort == 0 {
		return errors.New("smtp is not configured")
	}
	if s.FromEmail == "" {
		return errors.New("from_email is required")
	}
	pass, err := decryptString(s.SMTPPassword)
	if err != nil {
		return err
	}

	msg := gomail.NewMessage()
	msg.SetHeader("From", msg.FormatAddress(s.FromEmail, s.FromName))
	msg.SetHeader("To", opts.To)
	msg.SetHeader("Subject", opts.Subject)
	if s.ReplyTo != "" {
		msg.SetHeader("Reply-To", s.ReplyTo)
	}
	for k, v := range opts.Headers {
		msg.SetHeader(k, v)
	}

	text := strings.TrimSpace(opts.Text)
	html := strings.TrimSpace(opts.HTML)
	if text == "" && html == "" {
		text = "(no content)"
	}
	if html != "" {
		msg.SetBody("text/html", html)
		if text != "" {
			msg.AddAlternative("text/plain", text)
		}
	} else {
		msg.SetBody("text/plain", text)
	}

	d := gomail.NewDialer(s.SMTPHost, s.SMTPPort, s.SMTPUsername, pass)
	tlsMode := strings.ToLower(strings.TrimSpace(s.SMTPTLSMode))
	if tlsMode == "ssl" {
		d.SSL = true
	}
	// starttls is default for gomail when SSL=false.
	// For "none", some servers allow plain on port 25.
	// We keep gomail default behavior; users can set port/tls mode accordingly.

	return d.DialAndSend(msg)
}

type VerificationPurpose string

const (
	PurposeRegister VerificationPurpose = "register"
	PurposeReset    VerificationPurpose = "reset"
)

func GenerateVerificationCode() (string, error) {
	// 6 digits
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	val := int(b[0])<<16 | int(b[1])<<8 | int(b[2])
	code := fmt.Sprintf("%06d", val%1000000)
	return code, nil
}

func CreateAndSendVerificationCode(db *gorm.DB, email string, purpose VerificationPurpose) error {
	s, err := GetOrCreateEmailSetting(db)
	if err != nil {
		return err
	}
	if !s.Enabled {
		return errors.New("email is disabled")
	}

	// basic resend throttling
	var last models.EmailVerificationCode
	if err := db.Where("email = ? AND purpose = ?", email, string(purpose)).Order("created_at DESC").First(&last).Error; err == nil {
		min := s.CodeResendSeconds
		if min <= 0 {
			min = 60
		}
		if time.Since(last.CreatedAt) < time.Duration(min)*time.Second {
			return fmt.Errorf("please wait %d seconds before requesting another code", min)
		}
	}

	code, err := GenerateVerificationCode()
	if err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	expMin := s.CodeExpiryMinutes
	if expMin <= 0 {
		expMin = 10
	}
	rec := models.EmailVerificationCode{
		Email:     email,
		Purpose:   string(purpose),
		CodeHash:  string(hash),
		ExpiresAt: time.Now().Add(time.Duration(expMin) * time.Minute),
	}
	if err := db.Create(&rec).Error; err != nil {
		return err
	}

	subject := "Your Vcocnc verification code"
	if purpose == PurposeReset {
		subject = "Reset your Vcocnc password"
	}

	text := fmt.Sprintf(
		"Vcocnc\n\nYour verification code is: %s\n\nThis code expires in %d minutes.\nIf you did not request this, you can ignore this email.\n\n--\nVcocnc Spare Parts\n",
		code, expMin,
	)
	html := fmt.Sprintf(
		"<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;line-height:1.5;color:#111\">"+
			"<h2 style=\"margin:0 0 12px 0\">Vcocnc Verification Code</h2>"+
			"<p style=\"margin:0 0 14px 0\">Use the code below to continue:</p>"+
			"<div style=\"font-size:28px;font-weight:700;letter-spacing:6px;background:#fff8e1;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;display:inline-block\">%s</div>"+
			"<p style=\"margin:14px 0 0 0;font-size:13px;color:#555\">Expires in %d minutes. If you did not request this, you can ignore this email.</p>"+
			"<hr style=\"border:none;border-top:1px solid #eee;margin:18px 0\"/>"+
			"<div style=\"font-size:12px;color:#777\">Vcocnc Spare Parts</div>"+
			"</div>",
		code, expMin,
	)

	headers := map[string]string{
		"X-Entity-Ref-ID": fmt.Sprintf("verify:%s:%d", string(purpose), rec.ID),
	}

	return SendEmail(db, EmailSendOptions{To: email, Subject: subject, Text: text, HTML: html, Headers: headers})
}

func VerifyEmailCode(db *gorm.DB, email string, purpose VerificationPurpose, code string) error {
	var rec models.EmailVerificationCode
	if err := db.Where("email = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?", email, string(purpose), time.Now()).
		Order("created_at DESC").First(&rec).Error; err != nil {
		return errors.New("invalid or expired code")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(rec.CodeHash), []byte(code)); err != nil {
		return errors.New("invalid or expired code")
	}
	now := time.Now()
	if err := db.Model(&models.EmailVerificationCode{}).Where("id = ?", rec.ID).Update("used_at", &now).Error; err != nil {
		return err
	}
	return nil
}

func UpdateSMTPPassword(db *gorm.DB, setting *models.EmailSetting, newPassword string) error {
	enc, err := encryptString(newPassword)
	if err != nil {
		return err
	}
	setting.SMTPPassword = enc
	return nil
}
