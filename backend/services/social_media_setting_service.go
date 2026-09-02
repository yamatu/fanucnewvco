package services

import (
	"errors"
	"fmt"
	"net/url"
	"strings"

	"fanuc-backend/models"

	"gorm.io/gorm"
)

var socialPlatformDomains = map[string][]string{
	"X":         {"x.com", "twitter.com"},
	"Facebook":  {"facebook.com", "fb.com"},
	"Instagram": {"instagram.com"},
	"LinkedIn":  {"linkedin.com"},
}

type SocialMediaSettingService struct {
	db *gorm.DB
}

type SocialMediaValidationError struct {
	err error
}

func (e *SocialMediaValidationError) Error() string {
	return e.err.Error()
}

func IsSocialMediaValidationError(err error) bool {
	var validationErr *SocialMediaValidationError
	return errors.As(err, &validationErr)
}

func NewSocialMediaSettingService(db *gorm.DB) *SocialMediaSettingService {
	return &SocialMediaSettingService{db: db}
}

func (s *SocialMediaSettingService) GetOrCreate() (*models.SocialMediaSetting, error) {
	var setting models.SocialMediaSetting
	if err := s.db.First(&setting, 1).Error; err == nil {
		return &setting, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	setting.ID = 1
	setting.LinkedInURL = "https://www.linkedin.com/in/wei-wei-8b5a3141a"
	if err := s.db.Create(&setting).Error; err != nil {
		return nil, err
	}
	return &setting, nil
}

func (s *SocialMediaSettingService) Update(req models.SocialMediaSettingRequest) (*models.SocialMediaSetting, error) {
	setting, err := s.GetOrCreate()
	if err != nil {
		return nil, err
	}

	values := []struct {
		platform string
		raw      string
		target   *string
	}{
		{platform: "X", raw: req.XURL, target: &setting.XURL},
		{platform: "Facebook", raw: req.FacebookURL, target: &setting.FacebookURL},
		{platform: "Instagram", raw: req.InstagramURL, target: &setting.InstagramURL},
		{platform: "LinkedIn", raw: req.LinkedInURL, target: &setting.LinkedInURL},
	}

	for _, value := range values {
		normalized, normalizeErr := NormalizeSocialMediaURL(value.platform, value.raw)
		if normalizeErr != nil {
			return nil, &SocialMediaValidationError{err: normalizeErr}
		}
		*value.target = normalized
	}

	if err := s.db.Save(setting).Error; err != nil {
		return nil, err
	}
	return setting, nil
}

func NormalizeSocialMediaURL(platform, raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", nil
	}

	parsed, err := url.ParseRequestURI(value)
	if err != nil || parsed.Hostname() == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") {
		return "", fmt.Errorf("%s URL must be a complete http or https URL", platform)
	}
	if parsed.User != nil {
		return "", fmt.Errorf("%s URL must not contain credentials", platform)
	}

	allowedDomains, ok := socialPlatformDomains[platform]
	if !ok {
		return "", fmt.Errorf("unsupported social platform: %s", platform)
	}
	host := strings.ToLower(strings.TrimSuffix(parsed.Hostname(), "."))
	for _, domain := range allowedDomains {
		if host == domain || strings.HasSuffix(host, "."+domain) {
			return parsed.String(), nil
		}
	}

	return "", fmt.Errorf("%s URL must use %s", platform, strings.Join(allowedDomains, " or "))
}
