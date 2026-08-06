package services

import (
	"errors"
	"fanuc-backend/models"

	"gorm.io/gorm"
)

type CompanyProfileService struct {
	db *gorm.DB
}

func NewCompanyProfileService(db *gorm.DB) *CompanyProfileService {
	return &CompanyProfileService{
		db: db,
	}
}

// GetCompanyProfile retrieves the company profile (there should be only one)
func (s *CompanyProfileService) GetCompanyProfile() (*models.CompanyProfile, error) {
	var profile models.CompanyProfile

	err := s.db.First(&profile).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("company profile not found")
		}
		return nil, err
	}

	return &profile, nil
}

// CreateCompanyProfile creates a new company profile
func (s *CompanyProfileService) CreateCompanyProfile(profile *models.CompanyProfile) (*models.CompanyProfile, error) {
	// Check if a profile already exists
	var existingProfile models.CompanyProfile
	err := s.db.First(&existingProfile).Error
	if err == nil {
		return nil, errors.New("company profile already exists, use update instead")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	err = s.db.Create(profile).Error
	if err != nil {
		return nil, err
	}

	return profile, nil
}

// UpdateCompanyProfile updates an existing company profile
func (s *CompanyProfileService) UpdateCompanyProfile(profile *models.CompanyProfile) (*models.CompanyProfile, error) {
	var existingProfile models.CompanyProfile
	err := s.db.First(&existingProfile, profile.ID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("company profile not found")
		}
		return nil, err
	}

	// Update the profile
	err = s.db.Save(profile).Error
	if err != nil {
		return nil, err
	}

	return profile, nil
}

// DeleteCompanyProfile deletes a company profile
func (s *CompanyProfileService) DeleteCompanyProfile(id uint) error {
	var profile models.CompanyProfile
	err := s.db.First(&profile, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("company profile not found")
		}
		return err
	}

	err = s.db.Delete(&profile).Error
	if err != nil {
		return err
	}

	return nil
}

// UpsertCompanyProfile creates or updates the company profile (only one profile allowed)
func (s *CompanyProfileService) UpsertCompanyProfile(profile *models.CompanyProfile) (*models.CompanyProfile, error) {
	var existingProfile models.CompanyProfile
	err := s.db.First(&existingProfile).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// No profile exists, create new one
			err = s.db.Create(profile).Error
			if err != nil {
				return nil, err
			}
			return profile, nil
		}
		return nil, err
	}

	// Profile exists, update it
	profile.ID = existingProfile.ID
	profile.CreatedAt = existingProfile.CreatedAt // Preserve original creation time
	err = s.db.Save(profile).Error
	if err != nil {
		return nil, err
	}

	return profile, nil
}

// GetCompanyProfileForPublic retrieves the company profile for public use
func (s *CompanyProfileService) GetCompanyProfileForPublic() (*models.CompanyProfile, error) {
	return s.GetCompanyProfile()
}

// InitializeDefaultProfile creates a default company profile if none exists
func (s *CompanyProfileService) InitializeDefaultProfile() error {
	var profile models.CompanyProfile
	err := s.db.First(&profile).Error
	if err == nil {
		// Profile already exists
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	// Create default profile
	defaultProfile := &models.CompanyProfile{
		CompanyName:       "Vibocnc",
		CompanySubtitle:   "Industrial Automation Specialists",
		EstablishmentYear: "2007",
		Location:          "Kunshan, China",
		WorkshopSize:      "3,500sqm",
		Description1:      "Since 2007, Vibocnc has helped maintenance teams source current, legacy and obsolete automation parts, verify models and coordinate inspection, repair evaluation and worldwide delivery.",
		Description2:      "We support multiple automation brands with 27 workers, 10 sales professionals and more than 100,000 items regularly stocked. Daily parcel volume is around 50-100 pieces, with testing, repair and worldwide delivery support.",
		Achievement:       "Multi-Brand Automation Parts Supplier",
		Stats: models.CompanyStatsArray{
			{Icon: "CalendarIcon", Value: "2007", Label: "Established", Description: "Founded in Kunshan, China"},
			{Icon: "UserGroupIcon", Value: "27", Label: "Workers", Description: "Professional team"},
			{Icon: "UserGroupIcon", Value: "10", Label: "Sales Staff", Description: "Dedicated sales team"},
			{Icon: "ArchiveBoxIcon", Value: "100,000", Label: "Items Stocked", Description: "Regular inventory"},
			{Icon: "TruckIcon", Value: "50-100", Label: "Daily Parcels", Description: "Shipments per day"},
			{Icon: "CurrencyDollarIcon", Value: "200M", Label: "Yearly Turnover", Description: "Annual revenue"},
		},
		Expertise: models.StringArray{
			"AB & ABB Components",
			"FANUC Systems",
			"Mitsubishi Parts",
			"Siemens Solutions",
			"Quality Testing",
			"Global Shipping",
		},
		WorkshopFacilities: models.WorkshopFacilitiesArray{
			{ID: "1", Title: "Modern Facility", Description: "State-of-the-art workshop with advanced equipment", ImageURL: "/api/placeholder/300/200"},
			{ID: "2", Title: "Inventory Management", Description: "Organized storage for 100,000+ items", ImageURL: "/api/placeholder/300/200"},
			{ID: "3", Title: "Quality Control", Description: "Rigorous testing and quality assurance", ImageURL: "/api/placeholder/300/200"},
		},
	}

	err = s.db.Create(defaultProfile).Error
	if err != nil {
		return err
	}

	return nil
}
