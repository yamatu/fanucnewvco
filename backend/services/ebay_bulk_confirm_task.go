package services

import (
	"log"
	"strings"
	"sync"
	"time"

	"fanuc-backend/config"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EbayBulkConfirmTaskStatus string

const (
	EbayBulkConfirmQueued     EbayBulkConfirmTaskStatus = "queued"
	EbayBulkConfirmProcessing EbayBulkConfirmTaskStatus = "processing"
	EbayBulkConfirmCompleted  EbayBulkConfirmTaskStatus = "completed"
	EbayBulkConfirmFailed     EbayBulkConfirmTaskStatus = "failed"

	ebayBulkConfirmMaxTasks = 20
)

type EbayBulkConfirmItemResult struct {
	ID         uint   `json:"id"`
	Success    bool   `json:"success"`
	StatusCode int    `json:"status_code"`
	Error      string `json:"error,omitempty"`
}

type EbayBulkConfirmTaskSnapshot struct {
	ID           string                      `json:"id"`
	Status       EbayBulkConfirmTaskStatus   `json:"status"`
	Total        int                         `json:"total"`
	Processed    int                         `json:"processed"`
	SuccessCount int                         `json:"success_count"`
	FailedCount  int                         `json:"failed_count"`
	SkippedCount int                         `json:"skipped_count"`
	ProgressPct  float64                     `json:"progress_pct"`
	Message      string                      `json:"message,omitempty"`
	Results      []EbayBulkConfirmItemResult `json:"results,omitempty"`
	StartedAt    *time.Time                  `json:"started_at,omitempty"`
	CompletedAt  *time.Time                  `json:"completed_at,omitempty"`
	CreatedAt    time.Time                   `json:"created_at"`
	UpdatedAt    time.Time                   `json:"updated_at"`
}

type EbayDraftConfirmFunc func(id uint, action string, userID *uint) (statusCode int, err error)

type ebayBulkConfirmTask struct {
	mu sync.RWMutex

	ID           string
	Status       EbayBulkConfirmTaskStatus
	IDs          []uint
	Action       string
	UserID       *uint
	Total        int
	Processed    int
	SuccessCount int
	FailedCount  int
	SkippedCount int
	ProgressPct  float64
	Message      string
	Results      []EbayBulkConfirmItemResult
	StartedAt    *time.Time
	CompletedAt  *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type ebayBulkConfirmManager struct {
	mu    sync.RWMutex
	order []string
	tasks map[string]*ebayBulkConfirmTask
}

var ebayBulkConfirmTasks = &ebayBulkConfirmManager{
	order: make([]string, 0, ebayBulkConfirmMaxTasks),
	tasks: make(map[string]*ebayBulkConfirmTask),
}

// StartEbayBulkConfirmTask creates an async task that confirms drafts in the background.
// The confirmFn callback is the actual confirm logic (typically from the controller).
func StartEbayBulkConfirmTask(ids []uint, action string, userID *uint, confirmFn EbayDraftConfirmFunc) EbayBulkConfirmTaskSnapshot {
	taskID := uuid.NewString()
	now := time.Now()

	task := &ebayBulkConfirmTask{
		ID:        taskID,
		Status:    EbayBulkConfirmQueued,
		IDs:       ids,
		Action:    action,
		UserID:    userID,
		Total:     len(ids),
		Results:   make([]EbayBulkConfirmItemResult, 0, len(ids)),
		Message:   "queued",
		CreatedAt: now,
		UpdatedAt: now,
	}

	ebayBulkConfirmTasks.add(task)

	go runEbayBulkConfirmTask(taskID, confirmFn)

	return task.snapshot()
}

func GetEbayBulkConfirmTaskSnapshot(taskID string) (EbayBulkConfirmTaskSnapshot, bool) {
	return ebayBulkConfirmTasks.getSnapshot(taskID)
}

func runEbayBulkConfirmTask(taskID string, confirmFn EbayDraftConfirmFunc) {
	task, ok := ebayBulkConfirmTasks.get(taskID)
	if !ok {
		return
	}

	now := time.Now()
	task.update(func(t *ebayBulkConfirmTask) {
		t.Status = EbayBulkConfirmProcessing
		t.Message = "processing"
		t.StartedAt = &now
		t.UpdatedAt = now
	})

	for i, id := range task.IDs {
		statusCode, err := confirmFn(id, task.Action, task.UserID)

		itemResult := EbayBulkConfirmItemResult{
			ID:         id,
			StatusCode: statusCode,
		}
		if err != nil {
			itemResult.Success = false
			itemResult.Error = err.Error()
		} else {
			itemResult.Success = true
		}

		task.update(func(t *ebayBulkConfirmTask) {
			t.Processed = i + 1
			t.Results = append(t.Results, itemResult)
			if itemResult.Success {
				t.SuccessCount++
			} else {
				t.FailedCount++
			}
			if t.Total > 0 {
				t.ProgressPct = float64(t.Processed) / float64(t.Total) * 100
			}
			t.Message = "processing"
			t.UpdatedAt = time.Now()
		})
	}

	finishedAt := time.Now()
	task.update(func(t *ebayBulkConfirmTask) {
		t.Status = EbayBulkConfirmCompleted
		t.ProgressPct = 100
		t.Message = "completed"
		t.CompletedAt = &finishedAt
		t.UpdatedAt = finishedAt
	})
}

// ---------- Auto-import daemon ----------

const (
	ebayAutoImportInterval  = 2 * time.Minute
	ebayAutoImportBatchSize = 50
)

var ebayAutoImportConfirmFn EbayDraftConfirmFunc

// StartEbayAutoImportDaemon starts a background goroutine that periodically
// auto-imports eligible pending drafts (new_unique + taxonomy matched + has category + has SKU).
func StartEbayAutoImportDaemon(confirmFn EbayDraftConfirmFunc) {
	ebayAutoImportConfirmFn = confirmFn
	go func() {
		time.Sleep(30 * time.Second)
		log.Println("[ebay-auto-import] daemon started")
		ticker := time.NewTicker(ebayAutoImportInterval)
		defer ticker.Stop()

		runEbayAutoImportCycle()
		for range ticker.C {
			runEbayAutoImportCycle()
		}
	}()
}

func runEbayAutoImportCycle() {
	if ebayAutoImportConfirmFn == nil {
		return
	}

	db := getAutoImportDB()
	if db == nil {
		return
	}

	type draftCandidate struct {
		ID               uint
		NormalizedModel  string
		NormalizedPartNo string
		NormalizedMPN    string
	}

	var candidates []draftCandidate
	err := db.Table("ebay_import_drafts").
		Select("id, normalized_model, normalized_part_number, normalized_mpn").
		Where("status = ? AND taxonomy_status = ? AND match_status = ?",
			EbayDraftStatusPending, EbayDraftTaxonomyMatched, EbayDraftMatchNewUnique,
		).
		Where("suggested_category_id IS NOT NULL AND suggested_category_id > 0").
		Order("created_at ASC").
		Limit(ebayAutoImportBatchSize).
		Find(&candidates).Error
	if err != nil {
		log.Printf("[ebay-auto-import] query error: %v", err)
		return
	}

	if len(candidates) == 0 {
		return
	}

	log.Printf("[ebay-auto-import] found %d eligible drafts", len(candidates))

	success := 0
	for _, c := range candidates {
		sku := strings.TrimSpace(c.NormalizedModel)
		if sku == "" {
			sku = strings.TrimSpace(c.NormalizedPartNo)
		}
		if sku == "" {
			sku = strings.TrimSpace(c.NormalizedMPN)
		}
		if sku == "" {
			continue
		}

		_, err := ebayAutoImportConfirmFn(c.ID, "create_new", nil)
		if err != nil {
			log.Printf("[ebay-auto-import] draft #%d failed: %v", c.ID, err)
			continue
		}
		success++
	}

	if success > 0 {
		log.Printf("[ebay-auto-import] imported %d/%d drafts", success, len(candidates))
	}
}

// ---------- Manager helpers ----------

func (t *ebayBulkConfirmTask) update(fn func(*ebayBulkConfirmTask)) {
	t.mu.Lock()
	defer t.mu.Unlock()
	fn(t)
}

func (t *ebayBulkConfirmTask) snapshot() EbayBulkConfirmTaskSnapshot {
	t.mu.RLock()
	defer t.mu.RUnlock()

	results := make([]EbayBulkConfirmItemResult, len(t.Results))
	copy(results, t.Results)

	return EbayBulkConfirmTaskSnapshot{
		ID:           t.ID,
		Status:       t.Status,
		Total:        t.Total,
		Processed:    t.Processed,
		SuccessCount: t.SuccessCount,
		FailedCount:  t.FailedCount,
		SkippedCount: t.SkippedCount,
		ProgressPct:  t.ProgressPct,
		Message:      t.Message,
		Results:      results,
		StartedAt:    t.StartedAt,
		CompletedAt:  t.CompletedAt,
		CreatedAt:    t.CreatedAt,
		UpdatedAt:    t.UpdatedAt,
	}
}

func (m *ebayBulkConfirmManager) add(task *ebayBulkConfirmTask) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.tasks[task.ID] = task
	m.order = append(m.order, task.ID)

	for len(m.order) > ebayBulkConfirmMaxTasks {
		oldID := m.order[0]
		old, ok := m.tasks[oldID]
		if !ok {
			m.order = m.order[1:]
			continue
		}
		old.mu.RLock()
		status := old.Status
		old.mu.RUnlock()
		if status != EbayBulkConfirmCompleted && status != EbayBulkConfirmFailed {
			break
		}
		m.order = m.order[1:]
		delete(m.tasks, oldID)
	}
}

func (m *ebayBulkConfirmManager) get(taskID string) (*ebayBulkConfirmTask, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	task, ok := m.tasks[taskID]
	return task, ok
}

func (m *ebayBulkConfirmManager) getSnapshot(taskID string) (EbayBulkConfirmTaskSnapshot, bool) {
	task, ok := m.get(taskID)
	if !ok {
		return EbayBulkConfirmTaskSnapshot{}, false
	}
	return task.snapshot(), true
}

func getAutoImportDB() *gorm.DB {
	defer func() { recover() }()
	return config.GetDB()
}
