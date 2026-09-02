package utils

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSafeExistingPath(t *testing.T) {
	root := t.TempDir()
	inside := filepath.Join(root, "media", "image.jpg")
	if err := os.MkdirAll(filepath.Dir(inside), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(inside, []byte("image"), 0o600); err != nil {
		t.Fatal(err)
	}

	got, err := SafeExistingPath(root, "media/image.jpg")
	if err != nil {
		t.Fatalf("SafeExistingPath() error = %v", err)
	}
	if got != inside {
		t.Fatalf("SafeExistingPath() = %q, want %q", got, inside)
	}

	if _, err := SafeExistingPath(root, "../outside.jpg"); err == nil {
		t.Fatal("SafeExistingPath() accepted lexical traversal")
	}
}

func TestSafeExistingPathRejectsEscapingSymlink(t *testing.T) {
	root := t.TempDir()
	outside := filepath.Join(t.TempDir(), "secret.txt")
	if err := os.WriteFile(outside, []byte("secret"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, filepath.Join(root, "linked.txt")); err != nil {
		t.Skipf("symlinks are unavailable: %v", err)
	}

	if _, err := SafeExistingPath(root, "linked.txt"); err == nil {
		t.Fatal("SafeExistingPath() accepted a symlink escaping root")
	}
}
