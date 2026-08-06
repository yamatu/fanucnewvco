package controllers

import "testing"

func TestParseAIArticleDraft(t *testing.T) {
	raw := "```json\n{\"title\":\"How to Inspect a Servo Drive\",\"slug\":\"inspect-servo-drive\",\"summary\":\"A practical inspection guide.\",\"content\":\"## Initial checks\\n\\n- Record the alarm code\",\"meta_title\":\"Servo Drive Inspection Guide\",\"meta_description\":\"Practical checks before requesting servo drive repair.\",\"meta_keywords\":\"servo drive, repair\"}\n```"

	draft, err := parseAIArticleDraft(raw)
	if err != nil {
		t.Fatalf("parseAIArticleDraft returned error: %v", err)
	}
	if draft.Title != "How to Inspect a Servo Drive" {
		t.Fatalf("unexpected title: %q", draft.Title)
	}
	if draft.Content == "" || draft.Slug != "inspect-servo-drive" {
		t.Fatalf("unexpected draft: %#v", draft)
	}
}

func TestParseAIArticleDraftRequiresTitleAndContent(t *testing.T) {
	_, err := parseAIArticleDraft(`{"title":"Incomplete","content":""}`)
	if err == nil {
		t.Fatal("expected an error for a draft without content")
	}
}
