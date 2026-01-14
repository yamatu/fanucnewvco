package utils

import (
	"regexp"
	"strings"
)

// ParseModelFromFilename extracts model number from image filename
// Supports various FANUC model formats like:
// A02B-0120-C041MAR_$_57.jpg
// A06B-6220-H006.png
// A860-2000-T301_image.jpg
// A03B-0807-C001-main.png
func ParseModelFromFilename(filename string) string {
	// Remove file extension
	nameWithoutExt := strings.TrimSuffix(filename, getFileExtension(filename))

	// Common FANUC model patterns
	patterns := []string{
		// Pattern 1: A##B-####-#### (most common FANUC format)
		`A\d{2}B-\d{4}-[A-Z]\d{3}[A-Z]*`,
		// Pattern 2: A##B-####-#### with additional characters
		`A\d{2}B-\d{4}-[A-Z]\d{3}[A-Z0-9]*`,
		// Pattern 3: A###-####-#### (encoder format)
		`A\d{3}-\d{4}-[A-Z]\d{3}[A-Z0-9]*`,
		// Pattern 4: More flexible pattern for various formats
		`[A-Z]\d{2,3}[A-Z]?-\d{4}-[A-Z0-9]{4,}`,
		// Pattern 5: Simple A##B-#### format
		`A\d{2}B-\d{4}`,
		// Pattern 6: A###-#### format
		`A\d{3}-\d{4}`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		if match := re.FindString(nameWithoutExt); match != "" {
			return strings.ToUpper(match)
		}
	}

	// If no pattern matches, try to extract any alphanumeric sequence
	// that looks like a model number (contains letters and numbers with dashes)
	fallbackPattern := `[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+`
	re := regexp.MustCompile(fallbackPattern)
	if match := re.FindString(strings.ToUpper(nameWithoutExt)); match != "" {
		return match
	}

	return ""
}

// getFileExtension returns the file extension including the dot
func getFileExtension(filename string) string {
	parts := strings.Split(filename, ".")
	if len(parts) > 1 {
		return "." + parts[len(parts)-1]
	}
	return ""
}

// GenerateProductNameFromModel creates a product name from model number
func GenerateProductNameFromModel(model string) string {
	if model == "" {
		return ""
	}

	// Determine product type based on model prefix
	productType := determineProductType(model)
	brand := "FANUC"

	return brand + " " + productType + " " + model
}

// DetermineProductType determines the product type based on model number (exported version)
func DetermineProductType(model string) string {
	return determineProductType(model)
}

// determineProductType determines the product type based on model number
func determineProductType(model string) string {
	model = strings.ToUpper(model)

	// FANUC model number patterns and their corresponding product types
	typeMap := map[string]string{
		"A06B":   "Servo Motor",
		"A02B":   "PCB Board",
		"A20B":   "PCB Board",
		"A16B":   "PCB Board",
		"A03B":   "Teach Pendant",
		"A05B":   "Teach Pendant",
		"A860":   "Encoder",
		"A06B-6": "Servo Amplifier",
		"A06B-0": "Servo Motor",
		"A06B-2": "Spindle Motor",
		"A06B-1": "Linear Motor",
		"A230":   "Controller",
		"A02B-0": "I/O Module",
		"A16B-1": "Power Supply",
		"A16B-2": "Memory Board",
		"A20B-1": "CPU Board",
		"A20B-2": "Axis Control Board",
		"A20B-3": "Main Board",
	}

	// Check for specific patterns first (longer matches)
	for prefix, productType := range typeMap {
		if strings.HasPrefix(model, prefix) {
			return productType
		}
	}

	// Default fallback based on first 4 characters
	if len(model) >= 4 {
		prefix := model[:4]
		if productType, exists := typeMap[prefix]; exists {
			return productType
		}
	}

	return "Industrial Component"
}

// GenerateShortDescription creates a short description for the product
func GenerateShortDescription(model, productType string) string {
	if model == "" {
		return ""
	}

	return "FANUC " + productType + " " + model + " - High-quality industrial automation component"
}

// GenerateDescription creates a detailed description for the product
func GenerateDescription(model, productType string) string {
	if model == "" {
		return ""
	}

	description := "The FANUC " + model + " is a high-performance " + strings.ToLower(productType) +
		" designed for industrial automation applications. This genuine FANUC component provides " +
		"exceptional reliability and precision for demanding manufacturing environments.\n\n"

	description += "Key Features:\n"
	description += "• Genuine FANUC quality and reliability\n"
	description += "• Designed for industrial automation\n"
	description += "• High-performance specifications\n"
	description += "• Compatible with FANUC systems\n"
	description += "• Professional-grade construction\n\n"

	description += "Applications:\n"
	description += "• CNC machine tools\n"
	description += "• Industrial robots\n"
	description += "• Factory automation systems\n"
	description += "• Manufacturing equipment\n\n"

	description += "This " + model + " component is ideal for replacement, repair, or upgrade applications " +
		"in FANUC-controlled systems. We provide genuine parts with quality assurance and technical support."

	return description
}

// GenerateSEOTitle creates an SEO-friendly title
func GenerateSEOTitle(model, productType string) string {
	if model == "" {
		return ""
	}

	return "FANUC " + model + " " + productType + " | Industrial Automation Parts"
}

// GenerateSEODescription creates an SEO-friendly meta description
func GenerateSEODescription(model, productType string) string {
	if model == "" {
		return ""
	}

	return "Buy genuine FANUC " + model + " " + strings.ToLower(productType) +
		". High-quality industrial automation component with fast shipping and warranty. Compatible with FANUC systems."
}

// GenerateSEOKeywords creates SEO keywords
func GenerateSEOKeywords(model, productType string) string {
	if model == "" {
		return ""
	}

	keywords := []string{
		"FANUC " + model,
		model,
		"FANUC " + strings.ToLower(productType),
		productType,
		"FANUC parts",
		"industrial automation",
		"CNC parts",
		"FANUC replacement",
		"automation components",
		"industrial parts",
	}

	return strings.Join(keywords, ", ")
}

// CleanFilename removes special characters and normalizes filename
func CleanFilename(filename string) string {
	// Remove special characters except alphanumeric, dots, dashes, and underscores
	re := regexp.MustCompile(`[^a-zA-Z0-9.\-_]`)
	cleaned := re.ReplaceAllString(filename, "_")

	// Remove multiple consecutive underscores
	re = regexp.MustCompile(`_+`)
	cleaned = re.ReplaceAllString(cleaned, "_")

	// Remove leading/trailing underscores
	cleaned = strings.Trim(cleaned, "_")

	return cleaned
}
