package services

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"testing"
)

func TestOptimizeImageUsesCompressedDefaultSize(t *testing.T) {
	t.Setenv("MEDIA_MAX_DIM", "")
	t.Setenv("MEDIA_JPEG_QUALITY", "")

	source := image.NewRGBA(image.Rect(0, 0, 2000, 1000))
	for y := 0; y < 1000; y++ {
		for x := 0; x < 2000; x++ {
			source.SetRGBA(x, y, color.RGBA{R: uint8(x % 255), G: uint8(y % 255), B: 120, A: 255})
		}
	}

	var raw bytes.Buffer
	if err := jpeg.Encode(&raw, source, &jpeg.Options{Quality: 100}); err != nil {
		t.Fatal(err)
	}

	optimized, mimeType, err := OptimizeImage(bytes.NewReader(raw.Bytes()), ".jpg")
	if err != nil {
		t.Fatal(err)
	}
	if mimeType != "image/jpeg" {
		t.Fatalf("mime type = %q, want image/jpeg", mimeType)
	}
	decoded, _, err := image.Decode(bytes.NewReader(optimized))
	if err != nil {
		t.Fatal(err)
	}
	if got := decoded.Bounds().Size(); got.X != 1440 || got.Y != 720 {
		t.Fatalf("optimized dimensions = %dx%d, want 1440x720", got.X, got.Y)
	}
	if len(optimized) >= raw.Len() {
		t.Fatalf("optimized image should be smaller: got %d bytes, source %d bytes", len(optimized), raw.Len())
	}
}
