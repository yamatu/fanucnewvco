package services

import "strings"

// BuildPurgeURLsForAdmin returns URLs to purge when admin triggers a targeted purge.
// If admin doesn't provide URLs, we will purge a small default set.
func BuildPurgeURLsForAdmin(urls []string) []string {
	if len(urls) == 0 {
		return buildDefaultPurgeURLs(nil)
	}
	clean := make([]string, 0, len(urls))
	for _, u := range urls {
		u = strings.TrimSpace(u)
		if u == "" {
			continue
		}
		clean = append(clean, u)
	}
	return buildDefaultPurgeURLs(clean)
}
