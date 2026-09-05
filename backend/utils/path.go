package utils

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
)

// SafeExistingPath resolves an existing relative path and verifies that neither
// lexical traversal nor symlinks can escape root.
func SafeExistingPath(root, relative string) (string, error) {
	trimmed := strings.TrimSpace(relative)
	if trimmed == "" || filepath.IsAbs(trimmed) {
		return "", errors.New("path must be relative")
	}

	cleanRelative := filepath.Clean(filepath.FromSlash(trimmed))
	if cleanRelative == "." || cleanRelative == ".." ||
		strings.HasPrefix(cleanRelative, ".."+string(os.PathSeparator)) {
		return "", errors.New("path escapes root")
	}

	rootAbsolute, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}
	rootResolved, err := filepath.EvalSymlinks(rootAbsolute)
	if err != nil {
		return "", err
	}
	candidateResolved, err := filepath.EvalSymlinks(filepath.Join(rootResolved, cleanRelative))
	if err != nil {
		return "", err
	}
	relativeToRoot, err := filepath.Rel(rootResolved, candidateResolved)
	if err != nil || relativeToRoot == ".." ||
		strings.HasPrefix(relativeToRoot, ".."+string(os.PathSeparator)) {
		return "", errors.New("path escapes root")
	}
	return candidateResolved, nil
}
