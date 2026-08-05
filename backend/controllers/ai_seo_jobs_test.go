package controllers

import (
	"strings"
	"testing"

	"fanuc-backend/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func TestApplyAIASEOCandidateStatusScope(t *testing.T) {
	db, err := gorm.Open(mysql.New(mysql.Config{
		DSN:                       "user:password@tcp(localhost:3306)/test?charset=utf8mb4&parseTime=True&loc=Local",
		SkipInitializeWithVersion: true,
	}), &gorm.Config{DryRun: true, DisableAutomaticPing: true})
	if err != nil {
		t.Fatalf("open dry-run database: %v", err)
	}

	tests := []struct {
		name          string
		req           aiSEOCandidateStartRequest
		wantFailed    bool
		wantUnstarted bool
	}{
		{name: "never optimized only", wantUnstarted: true},
		{name: "never optimized and failed", req: aiSEOCandidateStartRequest{IncludeFailed: true}, wantFailed: true, wantUnstarted: true},
		{name: "failed only overrides include failed", req: aiSEOCandidateStartRequest{IncludeFailed: true, FailedOnly: true}, wantFailed: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			sql := db.ToSQL(func(tx *gorm.DB) *gorm.DB {
				query := applyAIASEOCandidateStatusScope(tx.Model(&models.Product{}), test.req)
				return query.Find(&[]models.Product{})
			})
			hasFailed := strings.Contains(sql, "ai_seo_status = 'failed'")
			hasUnstarted := strings.Contains(sql, "ai_seo_status IS NULL") && strings.Contains(sql, "ai_seo_status = ''")
			if hasFailed != test.wantFailed {
				t.Fatalf("failed-product scope mismatch: SQL = %s", sql)
			}
			if hasUnstarted != test.wantUnstarted {
				t.Fatalf("never-optimized scope mismatch: SQL = %s", sql)
			}
		})
	}
}
