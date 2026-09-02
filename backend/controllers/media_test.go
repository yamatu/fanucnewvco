package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"fanuc-backend/config"
	"fanuc-backend/models"

	"github.com/gin-gonic/gin"
)

func TestMediaRotateRejectsInvalidDegrees(t *testing.T) {
	gin.SetMode(gin.TestMode)
	previousDB := config.DB
	config.DB = nil
	t.Cleanup(func() { config.DB = previousDB })

	router := gin.New()
	controller := &MediaController{}
	router.POST("/media/rotate", controller.Rotate)

	request := httptest.NewRequest(http.MethodPost, "/media/rotate", strings.NewReader(`{"asset_id":1,"degrees":45}`))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d; body=%s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
	}
	var response models.APIResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.Success {
		t.Fatalf("expected unsuccessful response: %#v", response)
	}
}
