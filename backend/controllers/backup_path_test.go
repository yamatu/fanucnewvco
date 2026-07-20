package controllers

import (
	"os"
	"path/filepath"
	"testing"
)

func TestManagedUploadsDirRejectsFilesystemRoot(t *testing.T) {
	t.Setenv("UPLOAD_PATH", filepath.VolumeName(string(os.PathSeparator))+string(os.PathSeparator))
	if _, err := managedUploadsDir(); err == nil {
		t.Fatal("managedUploadsDir() accepted a filesystem root")
	}
}

func TestManagedUploadsDirRejectsSymlinkToFilesystemRoot(t *testing.T) {
	link := filepath.Join(t.TempDir(), "uploads")
	if err := os.Symlink(string(os.PathSeparator), link); err != nil {
		t.Skipf("symlinks are unavailable: %v", err)
	}
	t.Setenv("UPLOAD_PATH", link)
	if _, err := managedUploadsDir(); err == nil {
		t.Fatal("managedUploadsDir() accepted a symlink to the filesystem root")
	}
}

func TestManagedUploadsDirAcceptsDedicatedDirectory(t *testing.T) {
	directory := t.TempDir()
	t.Setenv("UPLOAD_PATH", directory)
	got, err := managedUploadsDir()
	if err != nil {
		t.Fatalf("managedUploadsDir() error = %v", err)
	}
	want, err := filepath.Abs(directory)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("managedUploadsDir() = %q, want %q", got, want)
	}
}
