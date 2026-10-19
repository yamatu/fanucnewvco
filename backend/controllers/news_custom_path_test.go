package controllers

import "testing"

func TestDefaultArticleCustomPathIsCanonicalPath(t *testing.T) {
	if got := defaultArticleCustomPath("release-notes"); got != "news/release-notes" {
		t.Fatalf("defaultArticleCustomPath = %q", got)
	}
	// Must equal the public URL an article without a custom path already has,
	// so filling the column never changes existing links.
	if got := "/" + defaultArticleCustomPath("release-notes"); got != "/news/release-notes" {
		t.Fatalf("default path %q differs from the public URL", got)
	}
}

func TestIsGeneratedArticleCustomPath(t *testing.T) {
	if !isGeneratedArticleCustomPath("/news/release/", "release") {
		t.Fatal("generated default path not recognised")
	}
	if isGeneratedArticleCustomPath("guides/cnc/release", "release") {
		t.Fatal("deliberate custom path treated as generated")
	}
	if isGeneratedArticleCustomPath("news/other", "release") {
		t.Fatal("another article's default path treated as generated")
	}
}
