package controllers

import (
	"reflect"
	"testing"
)

func TestNormalizeBulkDraftIDs(t *testing.T) {
	got := normalizeBulkDraftIDs([]uint{0, 12, 12, 7, 0, 3, 7})
	want := []uint{12, 7, 3}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("normalizeBulkDraftIDs() = %#v, want %#v", got, want)
	}
}

func TestNormalizeBulkDraftIDsEmpty(t *testing.T) {
	if got := normalizeBulkDraftIDs([]uint{0, 0}); len(got) != 0 {
		t.Fatalf("normalizeBulkDraftIDs() = %#v, want empty", got)
	}
}
