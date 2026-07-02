package services

import (
	"regexp"
	"strings"

	"fanuc-backend/utils"
)

type ProductCategoryInference struct {
	BrandKey     string `json:"brand_key"`
	BrandName    string `json:"brand_name"`
	PartType     string `json:"part_type"`
	CategorySlug string `json:"category_slug"`
	MatchRule    string `json:"match_rule"`
}

var (
	reGenericCableIndicators = regexp.MustCompile(`(?i)(CABLE|CAB|CONN|CONNECTOR|HARNESS|WIRE|PLUG|SOCKET|TERMINAL|#L-?\d|-\d+(\.\d+)?M$)`)
	reGenericPowerIndicators = regexp.MustCompile(`(?i)(POWER|PSU|FUSE|TRANSISTOR|MODULE)`)
	reGenericIOIndicators    = regexp.MustCompile(`(?i)(I/?O|INPUT|OUTPUT|PLC)`)
	reGenericServoIndicators = regexp.MustCompile(`(?i)(SERVO|SPINDLE|ENCODER|AMPLIFIER|MOTOR|DRIVE)`)
	reGenericBoardIndicators = regexp.MustCompile(`(?i)(PCB|BOARD|CPU|MEMORY|AXIS|MAIN\s*BOARD|CARD)`)
	reGenericControlWords    = regexp.MustCompile(`(?i)(CONTROL|CONTROLLER|PENDANT|HMI|DISPLAY|MONITOR)`)
)

func NormalizeProductModel(model string) string {
	model = strings.TrimSpace(model)
	if model == "" {
		return ""
	}
	model = strings.ReplaceAll(model, "\\", "-")
	model = strings.ReplaceAll(model, "/", "-")
	model = strings.ReplaceAll(model, " ", "-")
	for strings.Contains(model, "--") {
		model = strings.ReplaceAll(model, "--", "-")
	}
	model = strings.Trim(model, "-")
	model = strings.ToUpper(model)
	if strings.HasPrefix(model, "FANUC-") {
		model = strings.TrimPrefix(model, "FANUC-")
	}
	if strings.HasPrefix(model, "FANUC ") {
		model = strings.TrimSpace(strings.TrimPrefix(model, "FANUC "))
	}
	return model
}

func NormalizeBrandKey(brand string) string {
	key := strings.ToLower(strings.TrimSpace(brand))
	key = strings.NewReplacer(" ", "", "-", "", "_", "").Replace(key)
	switch key {
	case "":
		return ""
	case "unknown":
		return "unknown"
	case "fanuc":
		return "fanuc"
	case "mitsubishi", "misubishi", "melsec":
		return "mitsubishi"
	case "siemens":
		return "siemens"
	case "abb":
		return "abb"
	case "allenbradley", "allenbradly", "ab", "rockwell":
		return "allen-bradley"
	case "sick":
		return "sick"
	default:
		return key
	}
}

func CanonicalBrandName(brand string) string {
	switch NormalizeBrandKey(brand) {
	case "":
		return ""
	case "fanuc":
		return "FANUC"
	case "mitsubishi":
		return "Mitsubishi"
	case "siemens":
		return "Siemens"
	case "abb":
		return "ABB"
	case "allen-bradley":
		return "Allen-Bradley"
	case "sick":
		return "SICK"
	default:
		return strings.TrimSpace(brand)
	}
}

func InferProductCategory(brand string, model string) ProductCategoryInference {
	normalizedModel := NormalizeProductModel(model)
	switch NormalizeBrandKey(brand) {
	case "fanuc":
		return inferFanucCategoryInference(normalizedModel)
	case "mitsubishi":
		return inferMitsubishiCategoryInference(normalizedModel)
	case "allen-bradley":
		return inferAllenBradleyCategoryInference(normalizedModel)
	case "tamagawa":
		return ProductCategoryInference{BrandKey: "tamagawa", BrandName: "Tamagawa", PartType: "Encoder / Feedback", CategorySlug: "tamagawa", MatchRule: "brand:tamagawa"}
	case "sick":
		return inferSickCategoryInference(normalizedModel)
	default:
		if looksLikeFanucModel(normalizedModel) {
			return inferFanucCategoryInference(normalizedModel)
		}
		return inferGenericCategoryInference(brand, normalizedModel)
	}
}

func inferGenericCategoryInference(brand string, model string) ProductCategoryInference {
	brandKey := NormalizeBrandKey(brand)
	brandName := CanonicalBrandName(brand)
	upper := NormalizeProductModel(model)
	if upper == "" {
		return ProductCategoryInference{
			BrandKey:     brandKey,
			BrandName:    brandName,
			PartType:     "Spare Part",
			CategorySlug: "fanuc-accessories-others",
			MatchRule:    "generic:empty-model",
		}
	}

	switch {
	case reGenericCableIndicators.MatchString(upper):
		return ProductCategoryInference{BrandKey: brandKey, BrandName: brandName, PartType: "Cable / Connector", CategorySlug: "fanuc-cables-connectors", MatchRule: "generic:cable-keyword"}
	case reGenericPowerIndicators.MatchString(upper):
		return ProductCategoryInference{BrandKey: brandKey, BrandName: brandName, PartType: "Power Supply Unit", CategorySlug: "fanuc-power-supply", MatchRule: "generic:power-keyword"}
	case reGenericIOIndicators.MatchString(upper):
		return ProductCategoryInference{BrandKey: brandKey, BrandName: brandName, PartType: "I/O Module", CategorySlug: "fanuc-i-o-module", MatchRule: "generic:io-keyword"}
	case reGenericServoIndicators.MatchString(upper):
		return ProductCategoryInference{BrandKey: brandKey, BrandName: brandName, PartType: "Servo Motor / Drive", CategorySlug: "fanuc-servo-amplifier-drive", MatchRule: "generic:servo-keyword"}
	case reGenericBoardIndicators.MatchString(upper):
		return ProductCategoryInference{BrandKey: brandKey, BrandName: brandName, PartType: "PCB Board", CategorySlug: "fanuc-pcb-control-board", MatchRule: "generic:board-keyword"}
	case reGenericControlWords.MatchString(upper):
		return ProductCategoryInference{BrandKey: brandKey, BrandName: brandName, PartType: "Control Unit", CategorySlug: "fanuc-cnc-system-parts", MatchRule: "generic:control-keyword"}
	default:
		return ProductCategoryInference{BrandKey: brandKey, BrandName: brandName, PartType: "Spare Part", CategorySlug: "fanuc-accessories-others", MatchRule: "generic:fallback"}
	}
}

func inferMitsubishiCategoryInference(model string) ProductCategoryInference {
	upper := NormalizeProductModel(model)
	switch {
	case strings.HasPrefix(upper, "MR-J4"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "MELSERVO MR-J4", CategorySlug: "melservo-mr-j4", MatchRule: "mitsubishi:mr-j4"}
	case strings.HasPrefix(upper, "MR-J3"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "MELSERVO MR-J3", CategorySlug: "melservo-mr-j3", MatchRule: "mitsubishi:mr-j3"}
	case strings.HasPrefix(upper, "MR-J2"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "MELSERVO MR-J2", CategorySlug: "melservo-mr-j2", MatchRule: "mitsubishi:mr-j2"}
	case strings.HasPrefix(upper, "HC"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "MELSERVO HC", CategorySlug: "melservo-hc", MatchRule: "mitsubishi:hc"}
	case strings.HasPrefix(upper, "HF"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "HF Series Servo Motor", CategorySlug: "hf-series", MatchRule: "mitsubishi:hf"}
	case strings.HasPrefix(upper, "HG"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "HG Series Servo Motor", CategorySlug: "hg-series", MatchRule: "mitsubishi:hg"}
	case strings.HasPrefix(upper, "FR-"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "FREQROL Inverter", CategorySlug: "freqrol-fr", MatchRule: "mitsubishi:fr"}
	case strings.HasPrefix(upper, "MDS"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "MDS Servo Drive", CategorySlug: "mds-servo-drives", MatchRule: "mitsubishi:mds"}
	case strings.HasPrefix(upper, "Q"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "Melsec-Q Module", CategorySlug: "melsec-q", MatchRule: "mitsubishi:q"}
	case strings.HasPrefix(upper, "GOT") || strings.HasPrefix(upper, "GT"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "GOT1000 HMI", CategorySlug: "got1000", MatchRule: "mitsubishi:got"}
	case strings.HasPrefix(upper, "FX"):
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "FX Series PLC", CategorySlug: "fx-series", MatchRule: "mitsubishi:fx"}
	default:
		return ProductCategoryInference{BrandKey: "mitsubishi", BrandName: "Mitsubishi", PartType: "A Series PLC Module", CategorySlug: "a-series", MatchRule: "mitsubishi:a-series"}
	}
}

func inferAllenBradleyCategoryInference(model string) ProductCategoryInference {
	upper := NormalizeProductModel(model)
	if strings.HasPrefix(upper, "22") || strings.HasPrefix(upper, "20") || strings.Contains(upper, "POWERFLEX") {
		return ProductCategoryInference{BrandKey: "allen-bradley", BrandName: "Allen-Bradley", PartType: "Variable Frequency Drive", CategorySlug: "variable-frequency-drive", MatchRule: "allen-bradley:powerflex"}
	}
	return ProductCategoryInference{BrandKey: "allen-bradley", BrandName: "Allen-Bradley", PartType: "Industrial Automation Part", CategorySlug: "ab", MatchRule: "allen-bradley:fallback"}
}

func inferSickCategoryInference(model string) ProductCategoryInference {
	upper := NormalizeProductModel(model)
	switch {
	case strings.HasPrefix(upper, "WT") || strings.HasPrefix(upper, "WL") || strings.HasPrefix(upper, "W4") || strings.HasPrefix(upper, "W9") || strings.HasPrefix(upper, "W12"):
		return ProductCategoryInference{BrandKey: "sick", BrandName: "SICK", PartType: "Photoelectric Sensor", CategorySlug: "sick-photoelectric-sensors", MatchRule: "sick:photoelectric"}
	case strings.HasPrefix(upper, "IM") || strings.HasPrefix(upper, "IQ"):
		return ProductCategoryInference{BrandKey: "sick", BrandName: "SICK", PartType: "Inductive Proximity Sensor", CategorySlug: "sick-inductive-proximity-sensors", MatchRule: "sick:inductive"}
	case strings.HasPrefix(upper, "C4C") || strings.HasPrefix(upper, "EXE") || strings.Contains(upper, "DETEC"):
		return ProductCategoryInference{BrandKey: "sick", BrandName: "SICK", PartType: "Safety Light Curtain", CategorySlug: "sick-safety-light-curtains", MatchRule: "sick:safety-light-curtain"}
	case strings.HasPrefix(upper, "DFS") || strings.HasPrefix(upper, "AFS") || strings.HasPrefix(upper, "AFM") || strings.HasPrefix(upper, "DUS") || strings.HasPrefix(upper, "VFS"):
		return ProductCategoryInference{BrandKey: "sick", BrandName: "SICK", PartType: "Encoder", CategorySlug: "sick-encoders", MatchRule: "sick:encoder"}
	case strings.HasPrefix(upper, "LMS") || strings.HasPrefix(upper, "TIM") || strings.HasPrefix(upper, "MRS"):
		return ProductCategoryInference{BrandKey: "sick", BrandName: "SICK", PartType: "LiDAR Sensor", CategorySlug: "sick-lidar-sensors", MatchRule: "sick:lidar"}
	case strings.HasPrefix(upper, "CLV"):
		return ProductCategoryInference{BrandKey: "sick", BrandName: "SICK", PartType: "Barcode Scanner", CategorySlug: "sick-barcode-scanners", MatchRule: "sick:barcode"}
	case strings.HasPrefix(upper, "RFU") || strings.HasPrefix(upper, "RFH"):
		return ProductCategoryInference{BrandKey: "sick", BrandName: "SICK", PartType: "RFID Read/Write Device", CategorySlug: "sick-rfid", MatchRule: "sick:rfid"}
	case strings.HasPrefix(upper, "UC") || strings.HasPrefix(upper, "UM") || strings.HasPrefix(upper, "OD") || strings.HasPrefix(upper, "DT") || strings.HasPrefix(upper, "DL") || strings.HasPrefix(upper, "DX"):
		return ProductCategoryInference{BrandKey: "sick", BrandName: "SICK", PartType: "Ultrasonic / Distance Sensor", CategorySlug: "sick-ultrasonic-distance-sensors", MatchRule: "sick:distance"}
	default:
		return ProductCategoryInference{BrandKey: "sick", BrandName: "SICK", PartType: "Sensor", CategorySlug: "sick", MatchRule: "sick:fallback"}
	}
}

func looksLikeFanucModel(model string) bool {
	return strings.HasPrefix(model, "A02B") ||
		strings.HasPrefix(model, "A03B") ||
		strings.HasPrefix(model, "A04B") ||
		strings.HasPrefix(model, "A05B") ||
		strings.HasPrefix(model, "A06B") ||
		strings.HasPrefix(model, "A08B") ||
		strings.HasPrefix(model, "A13B") ||
		strings.HasPrefix(model, "A14B") ||
		strings.HasPrefix(model, "A16B") ||
		strings.HasPrefix(model, "A17B") ||
		strings.HasPrefix(model, "A20B") ||
		strings.HasPrefix(model, "A230") ||
		strings.HasPrefix(model, "A250") ||
		strings.HasPrefix(model, "A290") ||
		strings.HasPrefix(model, "A660") ||
		strings.HasPrefix(model, "A860") ||
		strings.HasPrefix(model, "A98L")
}

func inferCategorySlugFromPartType(partType string) string {
	lower := strings.ToLower(strings.TrimSpace(partType))
	switch {
	case lower == "":
		return "fanuc-accessories-others"
	case strings.Contains(lower, "cable"), strings.Contains(lower, "connector"), strings.Contains(lower, "harness"), strings.Contains(lower, "plug"), strings.Contains(lower, "socket"):
		return "fanuc-cables-connectors"
	case strings.Contains(lower, "power"), strings.Contains(lower, "fuse"), strings.Contains(lower, "transistor"):
		return "fanuc-power-supply"
	case strings.Contains(lower, "i/o"), strings.Contains(lower, "io module"), strings.Contains(lower, "input"), strings.Contains(lower, "output"):
		return "fanuc-i-o-module"
	case strings.Contains(lower, "spindle") && strings.Contains(lower, "motor"):
		return "fanuc-spindle-motor"
	case strings.Contains(lower, "spindle") && (strings.Contains(lower, "drive") || strings.Contains(lower, "amplifier")):
		return "fanuc-spindle-amplifier-drive"
	case strings.Contains(lower, "encoder"), strings.Contains(lower, "feedback"), strings.Contains(lower, "pulsecoder"):
		return "fanuc-encoder-feedback"
	case strings.Contains(lower, "servo") && strings.Contains(lower, "motor"):
		return "fanuc-servo-motor"
	case strings.Contains(lower, "servo"), strings.Contains(lower, "drive"), strings.Contains(lower, "amplifier"):
		return "fanuc-servo-amplifier-drive"
	case strings.Contains(lower, "pcb"), strings.Contains(lower, "board"), strings.Contains(lower, "cpu"), strings.Contains(lower, "memory"), strings.Contains(lower, "card"):
		return "fanuc-pcb-control-board"
	case strings.Contains(lower, "controller"), strings.Contains(lower, "control"), strings.Contains(lower, "pendant"), strings.Contains(lower, "display"), strings.Contains(lower, "monitor"):
		return "fanuc-cnc-system-parts"
	default:
		return "fanuc-accessories-others"
	}
}

func inferProductTypeFromModel(brand string, model string) string {
	if NormalizeBrandKey(brand) == "fanuc" {
		partType := utils.DetermineProductType(NormalizeProductModel(model))
		if partType != "" && partType != "Industrial Component" {
			return partType
		}
	}
	return InferProductCategory(brand, model).PartType
}
