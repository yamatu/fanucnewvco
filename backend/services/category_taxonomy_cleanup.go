package services

import (
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"

	"fanuc-backend/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// CategoryCleanupOptions selects which taxonomy repairs to plan or apply.
// Cleanup never touches products beyond moving them out of a duplicate node,
// and never deletes a category that still holds products anywhere in its
// subtree.
type CategoryCleanupOptions struct {
	MergeDuplicates bool `json:"merge_duplicates"`
	DeleteEmpty     bool `json:"delete_empty"`
	// DeleteEmptyActive additionally removes empty subtrees that are still
	// visible on the storefront. When false only hidden empty nodes are removed.
	DeleteEmptyActive bool `json:"delete_empty_active"`
}

type CategoryCleanupMerge struct {
	SourceID     uint   `json:"source_id"`
	SourceName   string `json:"source_name"`
	SourcePath   string `json:"source_path"`
	TargetID     uint   `json:"target_id"`
	TargetName   string `json:"target_name"`
	TargetPath   string `json:"target_path"`
	ProductCount int64  `json:"product_count"`
	ChildCount   int    `json:"child_count"`
	Reason       string `json:"reason"`
}

type CategoryCleanupDeletion struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Path     string `json:"path"`
	IsActive bool   `json:"is_active"`
	Reason   string `json:"reason"`
}

type CategoryCleanupPlan struct {
	TotalCategories int                       `json:"total_categories"`
	Merges          []CategoryCleanupMerge    `json:"merges"`
	Deletions       []CategoryCleanupDeletion `json:"deletions"`
}

type CategoryCleanupResult struct {
	Plan          CategoryCleanupPlan `json:"plan"`
	MergedCount   int                 `json:"merged_count"`
	DeletedCount  int                 `json:"deleted_count"`
	MovedProducts int64               `json:"moved_products"`
}

// cleanupCategory is the mutable in-memory view used while simulating merges.
type cleanupCategory struct {
	models.Category
	directProducts int64
	alive          bool
}

var categorySlugCollisionSuffix = regexp.MustCompile(`-\d+$`)

// categoryDedupKey normalizes a category name so pluralization and punctuation
// variants collide: "Servo Drives", "Servo Drive" and "Servo-Drives" share one
// key. It reuses the taxonomy normalization used by product classification so
// merge behaviour matches how products are routed into categories.
func categoryDedupKey(name string) string {
	tokens := taxonomyTokens(name)
	if len(tokens) == 0 {
		return ""
	}
	out := make([]string, 0, len(tokens))
	for _, token := range tokens {
		out = append(out, singularizeTaxonomyToken(token))
	}
	return strings.Join(out, " ")
}

func singularizeTaxonomyToken(token string) string {
	switch {
	case len(token) > 4 && strings.HasSuffix(token, "ies"):
		return strings.TrimSuffix(token, "ies") + "y"
	case len(token) > 4 && (strings.HasSuffix(token, "ches") || strings.HasSuffix(token, "shes") || strings.HasSuffix(token, "xes") || strings.HasSuffix(token, "sses")):
		return strings.TrimSuffix(token, "es")
	case len(token) > 3 && strings.HasSuffix(token, "s") && !strings.HasSuffix(token, "ss"):
		return strings.TrimSuffix(token, "s")
	default:
		return token
	}
}

// categorySlugBaseKey strips the numeric collision suffix so
// "fanuc-servo-drives" and "fanuc-servo-drives-2" collide.
func categorySlugBaseKey(slug string) string {
	slug = strings.TrimSpace(strings.ToLower(slug))
	if slug == "" {
		return ""
	}
	return categorySlugCollisionSuffix.ReplaceAllString(slug, "")
}

func cleanupParentKey(parentID *uint) uint {
	if parentID == nil {
		return 0
	}
	return *parentID
}

func cleanupCategoryPath(byID map[uint]*cleanupCategory, id uint) string {
	segments := make([]string, 0, 4)
	for depth := 0; depth < 12; depth++ {
		node, ok := byID[id]
		if !ok {
			break
		}
		segments = append([]string{node.Name}, segments...)
		if node.ParentID == nil {
			break
		}
		id = *node.ParentID
	}
	return strings.Join(segments, " > ")
}

// BuildCategoryCleanupPlan computes a deterministic repair plan for the whole
// taxonomy: sibling categories whose normalized names (or slug bases) collide
// are merged into one canonical node, and subtrees without any product are
// removed. The plan is a pure computation; ApplyCategoryCleanup re-derives it
// inside the write transaction so a stale preview can never delete fresh data.
func BuildCategoryCleanupPlan(db *gorm.DB, opts CategoryCleanupOptions) (*CategoryCleanupPlan, error) {
	if db == nil {
		return nil, errors.New("database is nil")
	}
	var categories []models.Category
	if err := db.Order("id ASC").Find(&categories).Error; err != nil {
		return nil, err
	}
	type productCountRow struct {
		CategoryID uint
		Count      int64
	}
	var counts []productCountRow
	if err := db.Model(&models.Product{}).
		Select("category_id AS category_id, COUNT(*) AS count").
		Group("category_id").
		Scan(&counts).Error; err != nil {
		return nil, err
	}
	countByCategory := make(map[uint]int64, len(counts))
	for _, row := range counts {
		countByCategory[row.CategoryID] = row.Count
	}
	return buildCategoryCleanupPlan(categories, countByCategory, opts), nil
}

func buildCategoryCleanupPlan(categories []models.Category, productCounts map[uint]int64, opts CategoryCleanupOptions) *CategoryCleanupPlan {
	byID := make(map[uint]*cleanupCategory, len(categories))
	ordered := make([]*cleanupCategory, 0, len(categories))
	for _, category := range categories {
		node := &cleanupCategory{Category: category, directProducts: productCounts[category.ID], alive: true}
		byID[category.ID] = node
		ordered = append(ordered, node)
	}

	plan := &CategoryCleanupPlan{TotalCategories: len(categories), Merges: []CategoryCleanupMerge{}, Deletions: []CategoryCleanupDeletion{}}

	if opts.MergeDuplicates {
		// Merging two parents can turn their children into new duplicate
		// siblings, so repeat until a pass finds nothing. The pass count is
		// bounded by tree depth; 12 passes cover any realistic catalog.
		for pass := 0; pass < 12; pass++ {
			merges := planDuplicateSiblingMerges(ordered, byID)
			if len(merges) == 0 {
				break
			}
			plan.Merges = append(plan.Merges, merges...)
		}
	}

	if opts.DeleteEmpty {
		plan.Deletions = planEmptySubtreeDeletions(ordered, byID, opts.DeleteEmptyActive)
	}
	return plan
}

func planDuplicateSiblingMerges(ordered []*cleanupCategory, byID map[uint]*cleanupCategory) []CategoryCleanupMerge {
	merges := make([]CategoryCleanupMerge, 0)
	groups := map[string][]*cleanupCategory{}
	groupKeys := make([]string, 0)
	addToGroup := func(key string, node *cleanupCategory) {
		if key == "" {
			return
		}
		if _, seen := groups[key]; !seen {
			groupKeys = append(groupKeys, key)
		}
		for _, existing := range groups[key] {
			if existing.ID == node.ID {
				return
			}
		}
		groups[key] = append(groups[key], node)
	}
	for _, node := range ordered {
		if !node.alive {
			continue
		}
		parent := cleanupParentKey(node.ParentID)
		if nameKey := categoryDedupKey(node.Name); nameKey != "" {
			addToGroup(fmt.Sprintf("name:%d:%s", parent, nameKey), node)
		}
		if slugKey := categorySlugBaseKey(node.Slug); slugKey != "" {
			addToGroup(fmt.Sprintf("slug:%d:%s", parent, slugKey), node)
		}
	}

	merged := map[uint]bool{}
	for _, key := range groupKeys {
		group := groups[key]
		if len(group) < 2 {
			continue
		}
		candidates := make([]*cleanupCategory, 0, len(group))
		for _, node := range group {
			if node.alive && !merged[node.ID] {
				candidates = append(candidates, node)
			}
		}
		if len(candidates) < 2 {
			continue
		}
		sort.SliceStable(candidates, func(i, j int) bool {
			return cleanupTargetPreferred(candidates[i], candidates[j])
		})
		target := candidates[0]
		reason := "duplicate name"
		if strings.HasPrefix(key, "slug:") {
			reason = "duplicate slug"
		}
		for _, source := range candidates[1:] {
			childCount := 0
			for _, node := range ordered {
				if node.alive && node.ID != source.ID && cleanupParentKey(node.ParentID) == source.ID {
					childCount++
				}
			}
			merges = append(merges, CategoryCleanupMerge{
				SourceID:     source.ID,
				SourceName:   source.Name,
				SourcePath:   cleanupCategoryPath(byID, source.ID),
				TargetID:     target.ID,
				TargetName:   target.Name,
				TargetPath:   cleanupCategoryPath(byID, target.ID),
				ProductCount: source.directProducts,
				ChildCount:   childCount,
				Reason:       reason,
			})
			// Simulate the merge so later passes see the post-merge tree.
			for _, node := range ordered {
				if node.alive && node.ID != source.ID && cleanupParentKey(node.ParentID) == source.ID {
					parentCopy := target.ID
					node.ParentID = &parentCopy
				}
			}
			target.directProducts += source.directProducts
			source.directProducts = 0
			source.alive = false
			merged[source.ID] = true
		}
	}
	return merges
}

// cleanupTargetPreferred ranks which duplicate survives a merge: keep the
// visible node, then the one holding more products, then the one with a clean
// slug (no "-2" suffix), then the oldest.
func cleanupTargetPreferred(a, b *cleanupCategory) bool {
	if a.IsActive != b.IsActive {
		return a.IsActive
	}
	if a.directProducts != b.directProducts {
		return a.directProducts > b.directProducts
	}
	aClean := categorySlugBaseKey(a.Slug) == strings.ToLower(strings.TrimSpace(a.Slug))
	bClean := categorySlugBaseKey(b.Slug) == strings.ToLower(strings.TrimSpace(b.Slug))
	if aClean != bClean {
		return aClean
	}
	return a.ID < b.ID
}

func planEmptySubtreeDeletions(ordered []*cleanupCategory, byID map[uint]*cleanupCategory, includeActive bool) []CategoryCleanupDeletion {
	childrenByParent := map[uint][]*cleanupCategory{}
	for _, node := range ordered {
		if !node.alive {
			continue
		}
		childrenByParent[cleanupParentKey(node.ParentID)] = append(childrenByParent[cleanupParentKey(node.ParentID)], node)
	}

	subtreeProducts := map[uint]int64{}
	subtreeHasActive := map[uint]bool{}
	var walk func(node *cleanupCategory) (int64, bool)
	walk = func(node *cleanupCategory) (int64, bool) {
		total := node.directProducts
		hasActive := node.IsActive
		for _, child := range childrenByParent[node.ID] {
			childTotal, childActive := walk(child)
			total += childTotal
			hasActive = hasActive || childActive
		}
		subtreeProducts[node.ID] = total
		subtreeHasActive[node.ID] = hasActive
		return total, hasActive
	}
	for _, root := range childrenByParent[0] {
		walk(root)
	}

	deletions := make([]CategoryCleanupDeletion, 0)
	var collect func(node *cleanupCategory, insideEmpty bool)
	collect = func(node *cleanupCategory, insideEmpty bool) {
		empty := insideEmpty || (subtreeProducts[node.ID] == 0 && (includeActive || !subtreeHasActive[node.ID]))
		if empty {
			deletions = append(deletions, CategoryCleanupDeletion{
				ID:       node.ID,
				Name:     node.Name,
				Path:     cleanupCategoryPath(byID, node.ID),
				IsActive: node.IsActive,
				Reason:   "no products in subtree",
			})
		}
		for _, child := range childrenByParent[node.ID] {
			collect(child, empty)
		}
	}
	for _, root := range childrenByParent[0] {
		collect(root, false)
	}
	return deletions
}

// ApplyCategoryCleanup executes the cleanup inside one transaction. The plan is
// recomputed under row locks so concurrent imports or category edits cannot be
// clobbered by a stale preview. Products from duplicate categories are moved to
// the surviving node before the duplicate is removed.
func ApplyCategoryCleanup(db *gorm.DB, opts CategoryCleanupOptions) (*CategoryCleanupResult, error) {
	if db == nil {
		return nil, errors.New("database is nil")
	}
	result := &CategoryCleanupResult{}
	err := withCategoryCreationLock(func() error {
		return db.Transaction(func(tx *gorm.DB) error {
			var categories []models.Category
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Order("id ASC").Find(&categories).Error; err != nil {
				return err
			}
			type productCountRow struct {
				CategoryID uint
				Count      int64
			}
			var counts []productCountRow
			if err := tx.Model(&models.Product{}).
				Select("category_id AS category_id, COUNT(*) AS count").
				Group("category_id").
				Scan(&counts).Error; err != nil {
				return err
			}
			countByCategory := make(map[uint]int64, len(counts))
			for _, row := range counts {
				countByCategory[row.CategoryID] = row.Count
			}
			plan := buildCategoryCleanupPlan(categories, countByCategory, opts)
			result.Plan = *plan

			for _, merge := range plan.Merges {
				if merge.ProductCount > 0 {
					moved := tx.Model(&models.Product{}).
						Where("category_id = ?", merge.SourceID).
						Update("category_id", merge.TargetID)
					if moved.Error != nil {
						return moved.Error
					}
					result.MovedProducts += moved.RowsAffected
				}
				if err := tx.Model(&models.Category{}).
					Where("parent_id = ?", merge.SourceID).
					Update("parent_id", merge.TargetID).Error; err != nil {
					return err
				}
				if err := tx.Delete(&models.Category{}, merge.SourceID).Error; err != nil {
					return err
				}
				result.MergedCount++
			}

			// Children first: reversing the preorder listing guarantees every
			// node is removed after all of its descendants.
			for index := len(plan.Deletions) - 1; index >= 0; index-- {
				deletion := plan.Deletions[index]
				var remainingProducts int64
				if err := tx.Model(&models.Product{}).Where("category_id = ?", deletion.ID).Count(&remainingProducts).Error; err != nil {
					return err
				}
				if remainingProducts > 0 {
					return fmt.Errorf("category %d %q unexpectedly holds %d products; cleanup aborted", deletion.ID, deletion.Name, remainingProducts)
				}
				if err := tx.Delete(&models.Category{}, deletion.ID).Error; err != nil {
					return err
				}
				result.DeletedCount++
			}
			return nil
		})
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}
