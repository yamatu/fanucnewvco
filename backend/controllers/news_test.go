package controllers

import (
	"fanuc-backend/models"
	"testing"
)

func TestNormalizeContentType(t *testing.T) {
	for input, expected := range map[string]string{"blog": "blog", " BLOG ": "blog", "news": "news", "": "news", "other": "news"} {
		if actual := normalizeContentType(input); actual != expected {
			t.Fatalf("normalizeContentType(%q) = %q, want %q", input, actual, expected)
		}
	}
}

func TestGetArticlePublicPath(t *testing.T) {
	tests := []struct {
		article  models.Article
		expected string
	}{
		{models.Article{Slug: "release", ContentType: "news"}, "/news/release"},
		{models.Article{Slug: "guide", ContentType: "blog"}, "/blog/guide"},
		{models.Article{Slug: "guide", ContentType: "blog", CustomPath: "guides/cnc/guide"}, "/guides/cnc/guide"},
	}
	for _, test := range tests {
		if actual := getArticlePublicPath(test.article); actual != test.expected {
			t.Fatalf("getArticlePublicPath(%+v) = %q, want %q", test.article, actual, test.expected)
		}
	}
}

func TestDefaultArticleCustomPath(t *testing.T) {
	tests := []struct {
		contentType string
		slug        string
		expected    string
	}{
		{"blog", "fanuc-cnc-parts-selection-guide", "blog/fanuc-cnc-parts-selection-guide"},
		{"news", "release", "news/release"},
		{"", "maintenance-note", "news/maintenance-note"},
	}
	for _, test := range tests {
		if actual := defaultArticleCustomPath(test.contentType, test.slug); actual != test.expected {
			t.Fatalf("defaultArticleCustomPath(%q, %q) = %q, want %q", test.contentType, test.slug, actual, test.expected)
		}
	}
}

func TestIsGeneratedArticleCustomPath(t *testing.T) {
	if !isGeneratedArticleCustomPath("/news/release", "news", "release") {
		t.Fatal("expected the canonical news path to be detected as generated")
	}
	if !isGeneratedArticleCustomPath("blog/guide", "blog", "guide") {
		t.Fatal("expected the canonical blog path to be detected as generated")
	}
	if !isGeneratedArticleCustomPath("news/guide", "blog", "guide") {
		t.Fatal("expected a stale generated news path on a blog article to be repairable")
	}
	if isGeneratedArticleCustomPath("guides/cnc/guide", "blog", "guide") {
		t.Fatal("explicit custom paths must not be treated as generated")
	}
}
