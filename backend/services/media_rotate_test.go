package services

import (
	"image"
	"image/color"
	"testing"
)

func TestRotateImagePixels90(t *testing.T) {
	source := image.NewNRGBA(image.Rect(0, 0, 2, 3))
	red := color.NRGBA{R: 255, A: 255}
	green := color.NRGBA{G: 255, A: 255}
	blue := color.NRGBA{B: 255, A: 255}
	source.Set(0, 0, red)
	source.Set(1, 0, green)
	source.Set(0, 2, blue)

	rotated, err := rotateImagePixels(source, 90)
	if err != nil {
		t.Fatalf("rotateImagePixels returned error: %v", err)
	}
	if got := rotated.Bounds(); got.Dx() != 3 || got.Dy() != 2 {
		t.Fatalf("unexpected bounds: %v", got)
	}
	if got := color.NRGBAModel.Convert(rotated.At(2, 0)).(color.NRGBA); got != red {
		t.Fatalf("red pixel moved to wrong position: %#v", got)
	}
	if got := color.NRGBAModel.Convert(rotated.At(2, 1)).(color.NRGBA); got != green {
		t.Fatalf("green pixel moved to wrong position: %#v", got)
	}
	if got := color.NRGBAModel.Convert(rotated.At(0, 0)).(color.NRGBA); got != blue {
		t.Fatalf("blue pixel moved to wrong position: %#v", got)
	}
}

func TestRotateImagePixelsRejectsUnsupportedDegrees(t *testing.T) {
	_, err := rotateImagePixels(image.NewNRGBA(image.Rect(0, 0, 1, 1)), 45)
	if err == nil {
		t.Fatal("expected invalid degrees to return an error")
	}
}
