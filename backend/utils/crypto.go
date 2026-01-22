package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"strings"
)

const (
	encPrefixV1 = "v1:"
)

// getEncryptionKey reads SETTINGS_ENCRYPTION_KEY from env.
// Accepted formats:
// - 32 raw ASCII chars (length 32)
// - base64 (decodes to 32 bytes)
// - hex (decodes to 32 bytes)
func getEncryptionKey() ([]byte, error) {
	v := strings.TrimSpace(os.Getenv("SETTINGS_ENCRYPTION_KEY"))
	if v == "" {
		return nil, errors.New("SETTINGS_ENCRYPTION_KEY not set")
	}
	// Raw 32-byte string
	if len(v) == 32 {
		return []byte(v), nil
	}
	// Try base64
	if b, err := base64.StdEncoding.DecodeString(v); err == nil {
		if len(b) == 32 {
			return b, nil
		}
	}
	// Try hex
	if b, err := hex.DecodeString(v); err == nil {
		if len(b) == 32 {
			return b, nil
		}
	}
	return nil, errors.New("SETTINGS_ENCRYPTION_KEY must be 32 bytes (raw/base64/hex)")
}

// EncryptSecret encrypts plaintext into a versioned string suitable for DB storage.
func EncryptSecret(plaintext string) (string, error) {
	key, err := getEncryptionKey()
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

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ct := gcm.Seal(nil, nonce, []byte(plaintext), nil)
	buf := append(nonce, ct...)
	return encPrefixV1 + base64.StdEncoding.EncodeToString(buf), nil
}

// DecryptSecret decrypts a string previously returned by EncryptSecret.
func DecryptSecret(enc string) (string, error) {
	enc = strings.TrimSpace(enc)
	if enc == "" {
		return "", errors.New("empty secret")
	}
	if !strings.HasPrefix(enc, encPrefixV1) {
		return "", errors.New("unsupported secret format")
	}

	payloadB64 := strings.TrimPrefix(enc, encPrefixV1)
	payload, err := base64.StdEncoding.DecodeString(payloadB64)
	if err != nil {
		return "", err
	}

	key, err := getEncryptionKey()
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

	ns := gcm.NonceSize()
	if len(payload) < ns {
		return "", errors.New("invalid secret payload")
	}
	nonce := payload[:ns]
	ct := payload[ns:]
	pt, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", err
	}
	return string(pt), nil
}
