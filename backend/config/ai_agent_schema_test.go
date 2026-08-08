package config

import "testing"

func TestRequiredAIAgentSchemaIncludesSEOJobProfileColumn(t *testing.T) {
	want := map[string]bool{
		"ai_agent_profiles.api_mode":          false,
		"ai_agent_settings.active_profile_id": false,
		"ai_agent_settings.api_mode":          false,
		"ai_agent_seo_jobs.ai_profile_id":     false,
		"ai_agent_seo_jobs.ai_profile_name":   false,
		"ai_agent_seo_jobs.ai_model":          false,
		"ai_agent_seo_jobs.ai_api_mode":       false,
	}
	for _, requirement := range requiredAIAgentSchemaColumns() {
		key := requirement.table + "." + requirement.column
		if _, expected := want[key]; !expected {
			t.Fatalf("unexpected AI schema requirement %q", key)
		}
		want[key] = true
	}
	for key, found := range want {
		if !found {
			t.Fatalf("missing AI schema requirement %q", key)
		}
	}
}

func TestAIAgentSchemaNilDatabaseGuard(t *testing.T) {
	if err := migrateAIAgentProfileSchema(nil); err == nil {
		t.Fatal("nil database should be rejected")
	}
	missing := missingAIAgentProfileSchema(nil)
	if len(missing) != 1 || missing[0] != "database connection" {
		t.Fatalf("nil database missing schema = %#v", missing)
	}
}
