package services

import (
	"bytes"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Image optimization goals:
// - Keep CPU usage reasonable (no heavy dependencies)
// - Reduce large uploads (resize) and reduce file size (re-encode)
// - Preserve GIF as-is (animated gifs)
//
// Defaults can be overridden via env:
// - MEDIA_MAX_DIM: max width/height (default 1600)
// - MEDIA_JPEG_QUALITY: 1..100 (default 82)
// - MEDIA_PNG_COMPRESSION: 0..3 (default 2) (0=best speed, 3=best compression)

func envInt(name string, def int) int {
	v := strings.TrimSpace(os.Getenv(name))
	if v == "" {
		return def
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return i
}

func clampInt(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func resizeNearest(img image.Image, maxDim int) image.Image {
	b := img.Bounds()
	sw, sh := b.Dx(), b.Dy()
	if sw <= 0 || sh <= 0 {
		return img
	}
	if sw <= maxDim && sh <= maxDim {
		return img
	}
	// scale to fit within maxDim
	scale := float64(maxDim) / float64(sw)
	if sh > sw {
		scale = float64(maxDim) / float64(sh)
	}
	if scale <= 0 {
		return img
	}
	dw := int(float64(sw) * scale)
	dh := int(float64(sh) * scale)
	if dw < 1 {
		dw = 1
	}
	if dh < 1 {
		dh = 1
	}

	// Use RGBA output.
	dst := image.NewRGBA(image.Rect(0, 0, dw, dh))
	for y := 0; y < dh; y++ {
		sy := int(float64(y) / float64(dh) * float64(sh))
		if sy >= sh {
			sy = sh - 1
		}
		for x := 0; x < dw; x++ {
			sx := int(float64(x) / float64(dw) * float64(sw))
			if sx >= sw {
				sx = sw - 1
			}
			dst.Set(x, y, img.At(b.Min.X+sx, b.Min.Y+sy))
		}
	}
	return dst
}

// OptimizeImage reads an image from r and returns an optimized image bytes and mime type.
// extHint should include dot (e.g. ".jpg").
func OptimizeImage(r io.Reader, extHint string) ([]byte, string, error) {
	ext := strings.ToLower(strings.TrimSpace(extHint))
	if ext == ".gif" {
		// Avoid breaking animations; don't optimize.
		b, err := io.ReadAll(r)
		if err != nil {
			return nil, "", err
		}
		return b, "image/gif", nil
	}

	// Read all because image decoders need seekable stream; uploads are capped (20MB).
	raw, err := io.ReadAll(r)
	if err != nil {
		return nil, "", err
	}
	if len(raw) == 0 {
		return nil, "", errors.New("empty image")
	}

	img, format, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, "", err
	}
	_ = format

	maxDim := envInt("MEDIA_MAX_DIM", 1600)
	maxDim = clampInt(maxDim, 300, 6000)
	img = resizeNearest(img, maxDim)

	var out bytes.Buffer

	switch ext {
	case ".jpg", ".jpeg":
		q := clampInt(envInt("MEDIA_JPEG_QUALITY", 82), 40, 95)
		err = jpeg.Encode(&out, img, &jpeg.Options{Quality: q})
		return out.Bytes(), "image/jpeg", err
	case ".png":
		lvl := clampInt(envInt("MEDIA_PNG_COMPRESSION", 2), 0, 3)
		enc := png.Encoder{CompressionLevel: png.DefaultCompression}
		switch lvl {
		case 0:
			enc.CompressionLevel = png.BestSpeed
		case 1:
			enc.CompressionLevel = png.DefaultCompression
		case 2:
			enc.CompressionLevel = png.DefaultCompression
		case 3:
			enc.CompressionLevel = png.BestCompression
		}
		err = enc.Encode(&out, img)
		return out.Bytes(), "image/png", err
	case ".webp":
		// No built-in webp encoder. Keep as-is.
		return raw, "image/webp", nil
	default:
		// If unknown, keep as-is.
		return raw, mimeFromExt(ext), nil
	}
}

func mimeFromExt(ext string) string {
	switch strings.ToLower(strings.TrimSpace(ext)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}

func sanitizeExtFromFilename(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == ".jpeg" {
		return ".jpg"
	}
	return ext
}

func IsSupportedMediaExt(filename string) bool {
	switch sanitizeExtFromFilename(filename) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp":
		return true
	default:
		return false
	}
}
