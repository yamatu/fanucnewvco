package services

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"strings"

	"fanuc-backend/models"
	"fanuc-backend/utils"

	"gorm.io/gorm"
)

type RotateMediaRequest struct {
	AssetID *uint
	URL     string
	Folder  string
	Degrees int
}

func rotateImagePixels(source image.Image, degrees int) (image.Image, error) {
	bounds := source.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	if width <= 0 || height <= 0 {
		return nil, errors.New("image has invalid dimensions")
	}

	switch degrees {
	case 90:
		destination := image.NewNRGBA(image.Rect(0, 0, height, width))
		for y := 0; y < height; y++ {
			for x := 0; x < width; x++ {
				destination.Set(height-1-y, x, source.At(bounds.Min.X+x, bounds.Min.Y+y))
			}
		}
		return destination, nil
	case 180:
		destination := image.NewNRGBA(image.Rect(0, 0, width, height))
		for y := 0; y < height; y++ {
			for x := 0; x < width; x++ {
				destination.Set(width-1-x, height-1-y, source.At(bounds.Min.X+x, bounds.Min.Y+y))
			}
		}
		return destination, nil
	case 270:
		destination := image.NewNRGBA(image.Rect(0, 0, height, width))
		for y := 0; y < height; y++ {
			for x := 0; x < width; x++ {
				destination.Set(y, width-1-x, source.At(bounds.Min.X+x, bounds.Min.Y+y))
			}
		}
		return destination, nil
	default:
		return nil, errors.New("degrees must be 90, 180, or 270")
	}
}

func findMediaAssetForRotation(db *gorm.DB, req RotateMediaRequest) (*models.MediaAsset, error) {
	if req.AssetID != nil && *req.AssetID > 0 {
		var asset models.MediaAsset
		if err := db.First(&asset, *req.AssetID).Error; err != nil {
			return nil, err
		}
		return &asset, nil
	}

	trimmedURL := strings.TrimSpace(req.URL)
	const uploadsPrefix = "/uploads/"
	if strings.HasPrefix(trimmedURL, uploadsPrefix) {
		relativePath := strings.TrimPrefix(trimmedURL, uploadsPrefix)
		var asset models.MediaAsset
		if err := db.Where("relative_path = ?", relativePath).First(&asset).Error; err != nil {
			return nil, err
		}
		return &asset, nil
	}

	if strings.HasPrefix(trimmedURL, "http://") || strings.HasPrefix(trimmedURL, "https://") {
		imported, err := ImportRemoteMedia(db, trimmedURL, "products/imported", "product,remote-import")
		if err != nil {
			return nil, err
		}
		return &imported.Asset, nil
	}

	return nil, errors.New("image must exist in the media library or use a public HTTP URL")
}

// RotateMediaAsset creates a new PNG media asset and preserves the original file.
func RotateMediaAsset(db *gorm.DB, req RotateMediaRequest) (*models.MediaAsset, error) {
	if db == nil {
		return nil, errors.New("database is required")
	}
	if req.Degrees != 90 && req.Degrees != 180 && req.Degrees != 270 {
		return nil, errors.New("degrees must be 90, 180, or 270")
	}

	sourceAsset, err := findMediaAssetForRotation(db, req)
	if err != nil {
		return nil, err
	}
	fullPath, err := utils.SafeExistingPath(getMediaUploadRoot(), sourceAsset.RelativePath)
	if err != nil {
		return nil, err
	}
	file, err := os.Open(fullPath)
	if err != nil {
		return nil, err
	}
	decoded, _, decodeErr := image.Decode(file)
	_ = file.Close()
	if decodeErr != nil {
		return nil, decodeErr
	}

	rotated, err := rotateImagePixels(decoded, req.Degrees)
	if err != nil {
		return nil, err
	}
	var output bytes.Buffer
	encoder := png.Encoder{CompressionLevel: png.BestSpeed}
	if err := encoder.Encode(&output, rotated); err != nil {
		return nil, err
	}
	content := output.Bytes()
	hash := sha256.Sum256(content)
	hashHex := hex.EncodeToString(hash[:])

	var existing models.MediaAsset
	if err := db.Where("sha256 = ?", hashHex).First(&existing).Error; err == nil {
		return &existing, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	fileName := hashHex + ".png"
	relativePath := filepath.ToSlash(filepath.Join("media", fileName))
	diskPath := filepath.Join(getMediaUploadRoot(), filepath.FromSlash(relativePath))
	if err := os.MkdirAll(filepath.Dir(diskPath), 0o755); err != nil {
		return nil, err
	}
	if err := os.WriteFile(diskPath, content, 0o644); err != nil {
		return nil, err
	}

	baseName := strings.TrimSuffix(sourceAsset.OriginalName, filepath.Ext(sourceAsset.OriginalName))
	if baseName == "" {
		baseName = "image"
	}
	asset := models.MediaAsset{
		OriginalName: fmt.Sprintf("%s-rotated-%d.png", utils.CleanFilename(baseName), req.Degrees),
		FileName:     fileName,
		RelativePath: relativePath,
		SHA256:       hashHex,
		MimeType:     "image/png",
		SizeBytes:    int64(len(content)),
		Title:        sourceAsset.Title,
		AltText:      sourceAsset.AltText,
		Folder:       sourceAsset.Folder,
		Tags:         strings.Trim(strings.TrimSpace(sourceAsset.Tags)+",rotated", ","),
	}
	if strings.TrimSpace(req.Folder) != "" {
		asset.Folder = strings.TrimSpace(req.Folder)
	}
	if err := db.Create(&asset).Error; err != nil {
		_ = os.Remove(diskPath)
		return nil, err
	}
	return &asset, nil
}
