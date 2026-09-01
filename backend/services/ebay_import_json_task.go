package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"fanuc-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	EbayDraftJSONTaskQueued     = "queued"
	EbayDraftJSONTaskProcessing = "processing"
	EbayDraftJSONTaskPaused     = "paused"
	EbayDraftJSONTaskCompleted  = "completed"
	EbayDraftJSONTaskFailed     = "failed"

	ebayDraftJSONTaskLimit  = 25
	ebayDraftJSONErrorLimit = 100
)

type EbayDraftJSONImportTaskSnapshot struct {
	ID          string     `json:"id"`
	Status      string     `json:"status"`
	Filename    string     `json:"filename"`
	FileSize    int64      `json:"file_size"`
	ProgressPct float64    `json:"progress_pct"`
	Processed   int        `json:"processed"`
	Created     int        `json:"created"`
	Skipped     int        `json:"skipped"`
	Failed      int        `json:"failed"`
	Message     string     `json:"message,omitempty"`
	Errors      []string   `json:"errors,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ebayDraftJSONImportTask struct {
	mu             sync.RWMutex
	cond           *sync.Cond
	pauseRequested bool

	ID          string
	Status      string
	Filename    string
	FilePath    string
	FileSize    int64
	ProgressPct float64
	Processed   int
	Created     int
	Skipped     int
	Failed      int
	Message     string
	Errors      []string
	CreatedAt   time.Time
	StartedAt   *time.Time
	CompletedAt *time.Time
	UpdatedAt   time.Time
}

type ebayDraftJSONImportManager struct {
	mu    sync.RWMutex
	order []string
	tasks map[string]*ebayDraftJSONImportTask
}

var ebayDraftJSONImports = &ebayDraftJSONImportManager{
	order: make([]string, 0, ebayDraftJSONTaskLimit),
	tasks: make(map[string]*ebayDraftJSONImportTask),
}

func StartEbayDraftJSONImportTask(db *gorm.DB, src io.Reader, filename string, fileSize int64) (EbayDraftJSONImportTaskSnapshot, error) {
	if db == nil {
		return EbayDraftJSONImportTaskSnapshot{}, errors.New("db is nil")
	}
	if src == nil {
		return EbayDraftJSONImportTaskSnapshot{}, errors.New("JSON file is required")
	}
	if ebayDraftJSONImports.hasActive() {
		return EbayDraftJSONImportTaskSnapshot{}, errors.New("another eBay draft JSON import is already running")
	}

	tempDir := filepath.Join(os.TempDir(), "ebay-draft-json-imports")
	if err := os.MkdirAll(tempDir, 0o755); err != nil {
		return EbayDraftJSONImportTaskSnapshot{}, err
	}
	taskID := uuid.NewString()
	tmpFile, err := os.CreateTemp(tempDir, fmt.Sprintf("%s-*.json", taskID))
	if err != nil {
		return EbayDraftJSONImportTaskSnapshot{}, err
	}
	cleanup := true
	defer func() {
		if cleanup {
			_ = tmpFile.Close()
			_ = os.Remove(tmpFile.Name())
		}
	}()
	written, err := io.Copy(tmpFile, src)
	if err != nil {
		return EbayDraftJSONImportTaskSnapshot{}, err
	}
	if err := tmpFile.Close(); err != nil {
		return EbayDraftJSONImportTaskSnapshot{}, err
	}
	if fileSize <= 0 {
		fileSize = written
	}
	now := time.Now()
	task := &ebayDraftJSONImportTask{
		ID:        taskID,
		Status:    EbayDraftJSONTaskQueued,
		Filename:  filename,
		FilePath:  tmpFile.Name(),
		FileSize:  fileSize,
		Message:   "queued",
		Errors:    make([]string, 0, ebayDraftJSONErrorLimit),
		CreatedAt: now,
		UpdatedAt: now,
	}
	task.cond = sync.NewCond(&task.mu)
	ebayDraftJSONImports.add(task)
	cleanup = false
	go runEbayDraftJSONImportTask(context.Background(), db, task)
	return task.snapshot(), nil
}

func GetEbayDraftJSONImportTask(taskID string) (EbayDraftJSONImportTaskSnapshot, bool) {
	return ebayDraftJSONImports.getSnapshot(strings.TrimSpace(taskID))
}

func GetLatestEbayDraftJSONImportTask() (EbayDraftJSONImportTaskSnapshot, bool) {
	return ebayDraftJSONImports.latestSnapshot()
}

func PauseEbayDraftJSONImportTask(taskID string) (EbayDraftJSONImportTaskSnapshot, error) {
	task, ok := ebayDraftJSONImports.get(strings.TrimSpace(taskID))
	if !ok {
		return EbayDraftJSONImportTaskSnapshot{}, errors.New("JSON import task not found")
	}
	return task.pause()
}

func ResumeEbayDraftJSONImportTask(taskID string) (EbayDraftJSONImportTaskSnapshot, error) {
	task, ok := ebayDraftJSONImports.get(strings.TrimSpace(taskID))
	if !ok {
		return EbayDraftJSONImportTaskSnapshot{}, errors.New("JSON import task not found")
	}
	return task.resume()
}

func runEbayDraftJSONImportTask(ctx context.Context, db *gorm.DB, task *ebayDraftJSONImportTask) {
	startedAt := time.Now()
	task.update(func(value *ebayDraftJSONImportTask) {
		if value.pauseRequested {
			value.Status = EbayDraftJSONTaskPaused
			value.Message = "paused"
		} else {
			value.Status = EbayDraftJSONTaskProcessing
			value.Message = "loading duplicate index"
		}
		value.StartedAt = &startedAt
		value.UpdatedAt = startedAt
	})

	err := processEbayDraftJSONImportFile(ctx, db, task)
	completedAt := time.Now()
	task.update(func(value *ebayDraftJSONImportTask) {
		value.CompletedAt = &completedAt
		value.UpdatedAt = completedAt
		if err != nil {
			value.Status = EbayDraftJSONTaskFailed
			value.Message = err.Error()
			appendEbayDraftJSONTaskError(value, err.Error())
		} else {
			value.Status = EbayDraftJSONTaskCompleted
			value.ProgressPct = 100
			value.Message = "completed"
		}
	})
	_ = os.Remove(task.FilePath)
}

func processEbayDraftJSONImportFile(ctx context.Context, db *gorm.DB, task *ebayDraftJSONImportTask) error {
	file, err := os.Open(task.FilePath)
	if err != nil {
		return err
	}
	defer file.Close()

	updateEbayDraftJSONTaskHeartbeat(task, 0, "loading duplicate index")
	listingKeys, sourceURLs, err := loadExistingEbayDraftImportKeys(db)
	if err != nil {
		return err
	}
	decoder := json.NewDecoder(file)
	decoder.UseNumber()
	updateEbayDraftJSONTaskHeartbeat(task, 0, "parsing JSON file")
	processItem := func(raw map[string]any) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := task.waitIfPaused(ctx); err != nil {
			return err
		}
		updateEbayDraftJSONTaskHeartbeat(task, decoder.InputOffset(), "processing product")
		normalized := NormalizeEbayImportDraftPayload(raw)
		listingKey, sourceURL := ebayDraftImportKeys(normalized)
		if (listingKey != "" && listingKeys[listingKey]) || (sourceURL != "" && sourceURLs[sourceURL]) {
			updateEbayDraftJSONTaskProgress(task, decoder.InputOffset(), 0, 1, 0, "skipped duplicate")
			return nil
		}
		built := BuildEbayImportDraftWithContext(ctx, db, normalized)
		draft := built.Draft
		if len(built.Errors) > 0 {
			draft.FailureReason = strings.Join(built.Errors, "; ")
		}
		if err := db.Create(&draft).Error; err != nil {
			updateEbayDraftJSONTaskProgress(task, decoder.InputOffset(), 0, 0, 1, err.Error())
			return nil
		}
		if listingKey != "" {
			listingKeys[listingKey] = true
		}
		if sourceURL != "" {
			sourceURLs[sourceURL] = true
		}
		updateEbayDraftJSONTaskProgress(task, decoder.InputOffset(), 1, 0, 0, "importing")
		return nil
	}

	firstToken, err := decoder.Token()
	if err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}
	switch delimiter := firstToken.(type) {
	case json.Delim:
		switch delimiter {
		case '[':
			if err := decodeEbayDraftJSONArray(decoder, processItem); err != nil {
				return err
			}
		case '{':
			found := false
			for decoder.More() {
				keyToken, err := decoder.Token()
				if err != nil {
					return err
				}
				key, _ := keyToken.(string)
				if key == "products" || key == "items" {
					arrayToken, err := decoder.Token()
					if err != nil {
						return err
					}
					if arrayToken != json.Delim('[') {
						return errors.New("products/items must be a JSON array")
					}
					found = true
					if err := decodeEbayDraftJSONArray(decoder, processItem); err != nil {
						return err
					}
				} else {
					var discard any
					if err := decoder.Decode(&discard); err != nil {
						return err
					}
				}
			}
			if !found {
				return errors.New("JSON must contain a products or items array")
			}
		default:
			return errors.New("JSON root must be an array or object")
		}
	default:
		return errors.New("JSON root must be an array or object")
	}
	return nil
}

func decodeEbayDraftJSONArray(decoder *json.Decoder, process func(map[string]any) error) error {
	for decoder.More() {
		var item map[string]any
		if err := decoder.Decode(&item); err != nil {
			return fmt.Errorf("invalid product JSON: %w", err)
		}
		if len(item) == 0 {
			continue
		}
		if err := process(item); err != nil {
			return err
		}
	}
	_, err := decoder.Token()
	return err
}

func loadExistingEbayDraftImportKeys(db *gorm.DB) (map[string]bool, map[string]bool, error) {
	var rows []struct {
		SourceSite string
		ListingID  string
		SourceURL  string
	}
	if err := db.Model(&models.EbayImportDraft{}).Select("source_site", "listing_id", "source_url").Find(&rows).Error; err != nil {
		return nil, nil, err
	}
	listingKeys := make(map[string]bool, len(rows))
	sourceURLs := make(map[string]bool, len(rows))
	for _, row := range rows {
		if key := normalizeEbayDraftListingKey(row.SourceSite, row.ListingID); key != "" {
			listingKeys[key] = true
		}
		if value := normalizeEbayDraftSourceURL(row.SourceURL); value != "" {
			sourceURLs[value] = true
		}
	}
	return listingKeys, sourceURLs, nil
}

func ebayDraftImportKeys(raw map[string]any) (string, string) {
	site := firstLegacyString(raw["source_site"], raw["site"])
	listingID := firstLegacyString(raw["listing_id"], raw["product_id"], raw["ebay_item_id"], raw["id"])
	sourceURL := firstLegacyString(raw["source_url"], raw["product_url"])
	return normalizeEbayDraftListingKey(site, listingID), normalizeEbayDraftSourceURL(sourceURL)
}

func normalizeEbayDraftListingKey(site, listingID string) string {
	listingID = strings.ToLower(strings.TrimSpace(listingID))
	if listingID == "" {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(site)) + "|" + listingID
}

func normalizeEbayDraftSourceURL(value string) string {
	return strings.ToLower(strings.TrimRight(strings.TrimSpace(value), "/"))
}

func updateEbayDraftJSONTaskProgress(task *ebayDraftJSONImportTask, offset int64, created, skipped, failed int, message string) {
	now := time.Now()
	task.update(func(value *ebayDraftJSONImportTask) {
		value.Processed++
		value.Created += created
		value.Skipped += skipped
		value.Failed += failed
		if value.FileSize > 0 {
			value.ProgressPct = minFloat64(99.9, float64(offset)*100/float64(value.FileSize))
		}
		value.Message = message
		value.UpdatedAt = now
		if failed > 0 && message != "" {
			appendEbayDraftJSONTaskError(value, message)
		}
	})
}

func updateEbayDraftJSONTaskHeartbeat(task *ebayDraftJSONImportTask, offset int64, message string) {
	now := time.Now()
	task.update(func(value *ebayDraftJSONImportTask) {
		if value.FileSize > 0 {
			value.ProgressPct = minFloat64(99.9, float64(offset)*100/float64(value.FileSize))
		}
		if !value.pauseRequested {
			value.Status = EbayDraftJSONTaskProcessing
			value.Message = message
		}
		value.UpdatedAt = now
	})
}

func appendEbayDraftJSONTaskError(task *ebayDraftJSONImportTask, message string) {
	message = strings.TrimSpace(message)
	if message == "" {
		return
	}
	if len(task.Errors) >= ebayDraftJSONErrorLimit {
		task.Errors = task.Errors[1:]
	}
	task.Errors = append(task.Errors, message)
}

func (manager *ebayDraftJSONImportManager) hasActive() bool {
	manager.mu.RLock()
	defer manager.mu.RUnlock()
	for _, task := range manager.tasks {
		task.mu.RLock()
		active := task.Status == EbayDraftJSONTaskQueued || task.Status == EbayDraftJSONTaskProcessing || task.Status == EbayDraftJSONTaskPaused
		task.mu.RUnlock()
		if active {
			return true
		}
	}
	return false
}

func (manager *ebayDraftJSONImportManager) add(task *ebayDraftJSONImportTask) {
	manager.mu.Lock()
	defer manager.mu.Unlock()
	manager.tasks[task.ID] = task
	manager.order = append([]string{task.ID}, manager.order...)
	for len(manager.order) > ebayDraftJSONTaskLimit {
		oldest := manager.order[len(manager.order)-1]
		manager.order = manager.order[:len(manager.order)-1]
		delete(manager.tasks, oldest)
	}
}

func (manager *ebayDraftJSONImportManager) getSnapshot(taskID string) (EbayDraftJSONImportTaskSnapshot, bool) {
	manager.mu.RLock()
	task, ok := manager.tasks[taskID]
	manager.mu.RUnlock()
	if !ok {
		return EbayDraftJSONImportTaskSnapshot{}, false
	}
	return task.snapshot(), true
}

func (manager *ebayDraftJSONImportManager) get(taskID string) (*ebayDraftJSONImportTask, bool) {
	manager.mu.RLock()
	defer manager.mu.RUnlock()
	task, ok := manager.tasks[taskID]
	return task, ok
}

func (manager *ebayDraftJSONImportManager) latestSnapshot() (EbayDraftJSONImportTaskSnapshot, bool) {
	manager.mu.RLock()
	if len(manager.order) == 0 {
		manager.mu.RUnlock()
		return EbayDraftJSONImportTaskSnapshot{}, false
	}
	task := manager.tasks[manager.order[0]]
	manager.mu.RUnlock()
	if task == nil {
		return EbayDraftJSONImportTaskSnapshot{}, false
	}
	return task.snapshot(), true
}

func (task *ebayDraftJSONImportTask) update(fn func(*ebayDraftJSONImportTask)) {
	task.mu.Lock()
	defer task.mu.Unlock()
	fn(task)
}

func (task *ebayDraftJSONImportTask) waitIfPaused(ctx context.Context) error {
	task.mu.Lock()
	defer task.mu.Unlock()
	for task.pauseRequested {
		if err := ctx.Err(); err != nil {
			return err
		}
		task.Status = EbayDraftJSONTaskPaused
		task.Message = "paused"
		task.UpdatedAt = time.Now()
		task.cond.Wait()
	}
	if task.Status == EbayDraftJSONTaskPaused {
		task.Status = EbayDraftJSONTaskProcessing
		task.Message = "resumed"
		task.UpdatedAt = time.Now()
	}
	return nil
}

func (task *ebayDraftJSONImportTask) pause() (EbayDraftJSONImportTaskSnapshot, error) {
	task.mu.Lock()
	if task.Status != EbayDraftJSONTaskQueued && task.Status != EbayDraftJSONTaskProcessing && task.Status != EbayDraftJSONTaskPaused {
		task.mu.Unlock()
		return EbayDraftJSONImportTaskSnapshot{}, errors.New("only queued or processing tasks can be paused")
	}
	task.pauseRequested = true
	task.Status = EbayDraftJSONTaskPaused
	task.Message = "pause requested; waiting for current product"
	task.UpdatedAt = time.Now()
	task.mu.Unlock()
	return task.snapshot(), nil
}

func (task *ebayDraftJSONImportTask) resume() (EbayDraftJSONImportTaskSnapshot, error) {
	task.mu.Lock()
	if task.Status != EbayDraftJSONTaskPaused || !task.pauseRequested {
		task.mu.Unlock()
		return EbayDraftJSONImportTaskSnapshot{}, errors.New("task is not paused")
	}
	task.pauseRequested = false
	task.Status = EbayDraftJSONTaskProcessing
	task.Message = "resuming"
	task.UpdatedAt = time.Now()
	task.cond.Broadcast()
	task.mu.Unlock()
	return task.snapshot(), nil
}

func (task *ebayDraftJSONImportTask) snapshot() EbayDraftJSONImportTaskSnapshot {
	task.mu.RLock()
	defer task.mu.RUnlock()
	return EbayDraftJSONImportTaskSnapshot{
		ID:          task.ID,
		Status:      task.Status,
		Filename:    task.Filename,
		FileSize:    task.FileSize,
		ProgressPct: task.ProgressPct,
		Processed:   task.Processed,
		Created:     task.Created,
		Skipped:     task.Skipped,
		Failed:      task.Failed,
		Message:     task.Message,
		Errors:      append([]string(nil), task.Errors...),
		CreatedAt:   task.CreatedAt,
		StartedAt:   task.StartedAt,
		CompletedAt: task.CompletedAt,
		UpdatedAt:   task.UpdatedAt,
	}
}

func minFloat64(left, right float64) float64 {
	if left < right {
		return left
	}
	return right
}
