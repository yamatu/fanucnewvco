package controllers

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"

	"github.com/gin-gonic/gin"
)

// BackupController provides admin-only DB/media backup + restore endpoints.
// Design goals:
// - Use standard tools (mysqldump/mysql) for correctness.
// - Use ZIP as the transport format (easy for users to download/upload).
// - Avoid path traversal when extracting ZIP.
type BackupController struct{}

var (
	dbRestoreMu    sync.Mutex
	mediaRestoreMu sync.Mutex
)

type dbConfig struct {
	Host string
	Port string
	User string
	Pass string
	Name string
}

func getDBConfig() dbConfig {
	return dbConfig{
		Host: strings.TrimSpace(os.Getenv("DB_HOST")),
		Port: strings.TrimSpace(os.Getenv("DB_PORT")),
		User: strings.TrimSpace(os.Getenv("DB_USER")),
		Pass: os.Getenv("DB_PASSWORD"),
		Name: strings.TrimSpace(os.Getenv("DB_NAME")),
	}
}

func (c dbConfig) validate() error {
	if c.Host == "" || c.Port == "" || c.User == "" || c.Name == "" {
		return errors.New("missing DB_* env vars (DB_HOST/DB_PORT/DB_USER/DB_NAME)")
	}
	if _, err := strconv.Atoi(c.Port); err != nil {
		return fmt.Errorf("invalid DB_PORT: %w", err)
	}
	return nil
}

func findBinary(candidates ...string) (string, error) {
	for _, name := range candidates {
		if name == "" {
			continue
		}
		if _, err := exec.LookPath(name); err == nil {
			return name, nil
		}
	}
	return "", fmt.Errorf("missing required binary (install mysql client tools in the backend container): tried %s", strings.Join(candidates, ", "))
}

func safeZipPath(name string) (string, bool) {
	// ZIP spec uses forward slashes.
	n := strings.ReplaceAll(name, "\\", "/")
	n = strings.TrimPrefix(n, "/")
	n = filepath.Clean(n)
	if n == "." || n == "" {
		return "", false
	}
	if strings.HasPrefix(n, "..") || strings.Contains(n, "/..") {
		return "", false
	}
	// Disallow absolute paths after Clean on some platforms.
	if filepath.IsAbs(n) {
		return "", false
	}
	return n, true
}

func extractZipToDir(zipPath string, destDir string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		// Skip directories; they'll be created as needed.
		if f.FileInfo().IsDir() {
			continue
		}

		rel, ok := safeZipPath(f.Name)
		if !ok {
			return fmt.Errorf("unsafe path in zip: %q", f.Name)
		}
		outPath := filepath.Join(destDir, rel)
		if !strings.HasPrefix(outPath, destDir+string(os.PathSeparator)) && outPath != destDir {
			return fmt.Errorf("zip entry escapes dest: %q", f.Name)
		}

		if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}

		// Overwrite if exists.
		out, err := os.OpenFile(outPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
		if err != nil {
			rc.Close()
			return err
		}
		if _, err := io.Copy(out, rc); err != nil {
			out.Close()
			rc.Close()
			return err
		}
		out.Close()
		rc.Close()
	}
	return nil
}

func clearDir(dir string) error {
	ents, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, ent := range ents {
		p := filepath.Join(dir, ent.Name())
		if err := os.RemoveAll(p); err != nil {
			return err
		}
	}
	return nil
}

func detectSingleDirRoot(dir string) string {
	ents, err := os.ReadDir(dir)
	if err != nil {
		return dir
	}
	if len(ents) != 1 || !ents[0].IsDir() {
		return dir
	}
	return filepath.Join(dir, ents[0].Name())
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
		if err != nil {
			return err
		}
		if _, err := io.Copy(out, in); err != nil {
			out.Close()
			return err
		}
		return out.Close()
	})
}

func zipDirToFile(srcDir string, zipPath string) error {
	out, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer out.Close()

	zw := zip.NewWriter(out)
	defer zw.Close()

	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		// Zip uses forward slashes.
		rel = filepath.ToSlash(rel)

		if info.IsDir() {
			_, err := zw.Create(rel + "/")
			return err
		}

		fw, err := zw.Create(rel)
		if err != nil {
			return err
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		_, err = io.Copy(fw, in)
		return err
	})
}

func zipDirToFilePrefixed(srcDir string, zipPath string, prefix string) error {
	prefix = strings.Trim(prefix, "/")
	if prefix == "" {
		return zipDirToFile(srcDir, zipPath)
	}

	out, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer out.Close()

	zw := zip.NewWriter(out)
	defer zw.Close()

	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		rel = filepath.ToSlash(rel)
		rel = prefix + "/" + rel

		if info.IsDir() {
			_, err := zw.Create(rel + "/")
			return err
		}

		fw, err := zw.Create(rel)
		if err != nil {
			return err
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		_, err = io.Copy(fw, in)
		return err
	})
}

// DownloadDBBackup generates a ZIP with db.sql inside.
// GET /api/v1/admin/backup/db
func (bc *BackupController) DownloadDBBackup(c *gin.Context) {
	cfg := getDBConfig()
	if err := cfg.validate(); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid DB config", Error: err.Error()})
		return
	}
	dumpBin, err := findBinary("mysqldump", "mariadb-dump")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Backup tool missing", Error: err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Minute)
	defer cancel()

	tmpSQL, err := os.CreateTemp("", "fanuc-db-*.sql")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to create temp file", Error: err.Error()})
		return
	}
	tmpSQLPath := tmpSQL.Name()
	defer func() { _ = os.Remove(tmpSQLPath) }()
	defer tmpSQL.Close()

	// Some MySQL 8 environments require --no-tablespaces to avoid needing PROCESS privilege.
	args := []string{
		"--single-transaction",
		"--routines",
		"--events",
		"--triggers",
		"--add-drop-table",
		"--skip-lock-tables",
		"--no-tablespaces",
		"-h", cfg.Host,
		"-P", cfg.Port,
		"-u", cfg.User,
		cfg.Name,
	}

	var stderr bytes.Buffer
	cmd := exec.CommandContext(ctx, dumpBin, args...)
	cmd.Env = append(os.Environ(), "MYSQL_PWD="+cfg.Pass)
	cmd.Stdout = tmpSQL
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		// Retry without --no-tablespaces if client doesn't support it.
		if strings.Contains(stderr.String(), "unknown option") && strings.Contains(stderr.String(), "no-tablespaces") {
			stderr.Reset()
			_, _ = tmpSQL.Seek(0, 0)
			_ = tmpSQL.Truncate(0)
			args2 := []string{
				"--single-transaction",
				"--routines",
				"--events",
				"--triggers",
				"--add-drop-table",
				"--skip-lock-tables",
				"-h", cfg.Host,
				"-P", cfg.Port,
				"-u", cfg.User,
				cfg.Name,
			}
			cmd2 := exec.CommandContext(ctx, dumpBin, args2...)
			cmd2.Env = append(os.Environ(), "MYSQL_PWD="+cfg.Pass)
			cmd2.Stdout = tmpSQL
			cmd2.Stderr = &stderr
			if err2 := cmd2.Run(); err2 != nil {
				c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "mysqldump failed", Error: strings.TrimSpace(stderr.String())})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "mysqldump failed", Error: strings.TrimSpace(stderr.String())})
			return
		}
	}

	if _, err := tmpSQL.Seek(0, 0); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to read temp dump", Error: err.Error()})
		return
	}

	filename := fmt.Sprintf("fanuc-db-backup-%s.zip", time.Now().UTC().Format("20060102-150405"))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	c.Status(http.StatusOK)

	zw := zip.NewWriter(c.Writer)
	defer zw.Close()

	w, err := zw.Create("db.sql")
	if err != nil {
		return
	}
	_, _ = io.Copy(w, tmpSQL)
}

// RestoreDBBackup restores the DB from a ZIP containing a .sql file.
// POST /api/v1/admin/backup/db/restore?force=1  multipart/form-data: file
func (bc *BackupController) RestoreDBBackup(c *gin.Context) {
	if c.Query("force") != "1" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing confirmation", Error: "Set ?force=1 to confirm restoring the database"})
		return
	}

	locked := dbRestoreMu.TryLock()
	if !locked {
		c.JSON(http.StatusConflict, models.APIResponse{Success: false, Message: "Restore already in progress"})
		return
	}
	defer dbRestoreMu.Unlock()

	cfg := getDBConfig()
	if err := cfg.validate(); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid DB config", Error: err.Error()})
		return
	}
	mysqlBin, err := findBinary("mysql", "mariadb")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Restore tool missing", Error: err.Error()})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing file", Error: err.Error()})
		return
	}
	if file.Size <= 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Empty file"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to read upload", Error: err.Error()})
		return
	}
	defer src.Close()

	tmpZip, err := os.CreateTemp("", "fanuc-db-restore-*.zip")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to create temp file", Error: err.Error()})
		return
	}
	tmpZipPath := tmpZip.Name()
	defer func() { _ = os.Remove(tmpZipPath) }()
	if _, err := io.Copy(tmpZip, src); err != nil {
		tmpZip.Close()
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to save upload", Error: err.Error()})
		return
	}
	tmpZip.Close()

	zr, err := zip.OpenReader(tmpZipPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid zip", Error: err.Error()})
		return
	}
	defer zr.Close()

	var sqlFile *zip.File
	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		n := strings.ToLower(f.Name)
		if strings.HasSuffix(n, ".sql") {
			sqlFile = f
			break
		}
	}
	if sqlFile == nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid backup", Error: "zip must contain a .sql file"})
		return
	}

	rc, err := sqlFile.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to open sql in zip", Error: err.Error()})
		return
	}
	defer rc.Close()

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Minute)
	defer cancel()

	var stderr bytes.Buffer
	cmd := exec.CommandContext(ctx, mysqlBin,
		"-h", cfg.Host,
		"-P", cfg.Port,
		"-u", cfg.User,
		cfg.Name,
	)
	cmd.Env = append(os.Environ(), "MYSQL_PWD="+cfg.Pass)
	cmd.Stdin = rc
	cmd.Stdout = io.Discard
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "mysql restore failed", Error: strings.TrimSpace(stderr.String())})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Database restored successfully"})
}

// DownloadMediaBackup generates a ZIP of the uploads directory.
// GET /api/v1/admin/backup/media
func (bc *BackupController) DownloadMediaBackup(c *gin.Context) {
	uploadsDir := strings.TrimSpace(os.Getenv("UPLOAD_PATH"))
	if uploadsDir == "" {
		uploadsDir = "./uploads"
	}
	if st, err := os.Stat(uploadsDir); err != nil || !st.IsDir() {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Uploads directory not found", Error: uploadsDir})
		return
	}

	tmpZip, err := os.CreateTemp("", "fanuc-media-*.zip")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to create temp file", Error: err.Error()})
		return
	}
	tmpZipPath := tmpZip.Name()
	tmpZip.Close()
	defer func() { _ = os.Remove(tmpZipPath) }()

	// Zip the *contents* of uploadsDir (root entries like media/, products/, ...)
	if err := zipDirToFile(uploadsDir, tmpZipPath); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to create media zip", Error: err.Error()})
		return
	}

	f, err := os.Open(tmpZipPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to open zip", Error: err.Error()})
		return
	}
	defer f.Close()

	filename := fmt.Sprintf("fanuc-media-backup-%s.zip", time.Now().UTC().Format("20060102-150405"))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, f)
}

// RestoreMediaBackup restores uploads from a ZIP.
// POST /api/v1/admin/backup/media/restore?force=1  multipart/form-data: file
func (bc *BackupController) RestoreMediaBackup(c *gin.Context) {
	if c.Query("force") != "1" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing confirmation", Error: "Set ?force=1 to confirm restoring the media library"})
		return
	}

	locked := mediaRestoreMu.TryLock()
	if !locked {
		c.JSON(http.StatusConflict, models.APIResponse{Success: false, Message: "Restore already in progress"})
		return
	}
	defer mediaRestoreMu.Unlock()

	uploadsDir := strings.TrimSpace(os.Getenv("UPLOAD_PATH"))
	if uploadsDir == "" {
		uploadsDir = "./uploads"
	}
	if st, err := os.Stat(uploadsDir); err != nil || !st.IsDir() {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Uploads directory not found", Error: uploadsDir})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Missing file", Error: err.Error()})
		return
	}
	if file.Size <= 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Empty file"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to read upload", Error: err.Error()})
		return
	}
	defer src.Close()

	tmpZip, err := os.CreateTemp("", "fanuc-media-restore-*.zip")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to create temp file", Error: err.Error()})
		return
	}
	tmpZipPath := tmpZip.Name()
	defer func() { _ = os.Remove(tmpZipPath) }()
	if _, err := io.Copy(tmpZip, src); err != nil {
		tmpZip.Close()
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to save upload", Error: err.Error()})
		return
	}
	_ = tmpZip.Close()

	tmpDir, err := os.MkdirTemp("", "fanuc-media-restore-*")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to create temp dir", Error: err.Error()})
		return
	}
	defer func() { _ = os.RemoveAll(tmpDir) }()

	if err := extractZipToDir(tmpZipPath, tmpDir); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Failed to extract zip", Error: err.Error()})
		return
	}

	// macOS zip artifacts can break "single root dir" detection.
	_ = os.RemoveAll(filepath.Join(tmpDir, "__MACOSX"))

	restoreRoot := detectSingleDirRoot(tmpDir)

	// Some users zip the whole "uploads/" folder instead of its contents.
	// Normalize so we always copy the *contents* into uploadsDir.
	if st, err := os.Stat(filepath.Join(restoreRoot, "uploads")); err == nil && st.IsDir() {
		restoreRoot = filepath.Join(restoreRoot, "uploads")
	}
	if st, err := os.Stat(filepath.Join(restoreRoot, "app", "uploads")); err == nil && st.IsDir() {
		restoreRoot = filepath.Join(restoreRoot, "app", "uploads")
	}

	// Replace uploads content (destructive by design).
	if err := clearDir(uploadsDir); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to clear uploads", Error: err.Error()})
		return
	}
	if err := copyDir(restoreRoot, uploadsDir); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to restore uploads", Error: err.Error()})
		return
	}

	// Re-index media files into media_assets so the admin media library shows restored files.
	if db := config.GetDB(); db != nil {
		_, _ = services.SyncMediaAssetsFromDisk(db, uploadsDir)
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Media library restored successfully"})
}
