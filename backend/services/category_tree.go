package services

import (
	"fanuc-backend/models"
	"sort"
	"strings"
	"time"
)

// CategoryNode is a JSON-friendly representation of Category with computed path and deep children.
// It intentionally omits heavy relations like Products/Translations.
type CategoryNode struct {
	ID          uint           `json:"id"`
	Name        string         `json:"name"`
	Slug        string         `json:"slug"`
	Path        string         `json:"path"`
	Description string         `json:"description"`
	ImageURL    string         `json:"image_url"`
	ParentID    *uint          `json:"parent_id"`
	SortOrder   int            `json:"sort_order"`
	IsActive    bool           `json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	Children    []CategoryNode `json:"children,omitempty"`
}

// categorySort sorts categories by sort_order then name.
func categorySort(a, b models.Category) bool {
	if a.SortOrder != b.SortOrder {
		return a.SortOrder < b.SortOrder
	}
	return strings.ToLower(a.Name) < strings.ToLower(b.Name)
}

func buildNode(c models.Category, path string, children []CategoryNode) CategoryNode {
	return CategoryNode{
		ID:          c.ID,
		Name:        c.Name,
		Slug:        c.Slug,
		Path:        path,
		Description: c.Description,
		ImageURL:    c.ImageURL,
		ParentID:    c.ParentID,
		SortOrder:   c.SortOrder,
		IsActive:    c.IsActive,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
		Children:    children,
	}
}

// BuildCategoryTree builds a full-depth tree from a flat list of categories.
// The input list should contain all categories you want included (e.g. filtered by is_active).
func BuildCategoryTree(categories []models.Category) []CategoryNode {
	childrenByParent := map[uint][]models.Category{}
	roots := make([]models.Category, 0)

	for _, c := range categories {
		if c.ParentID == nil {
			roots = append(roots, c)
			continue
		}
		childrenByParent[*c.ParentID] = append(childrenByParent[*c.ParentID], c)
	}

	sort.Slice(roots, func(i, j int) bool { return categorySort(roots[i], roots[j]) })

	var walk func(cat models.Category, parentPath string) CategoryNode
	walk = func(cat models.Category, parentPath string) CategoryNode {
		path := cat.Slug
		if parentPath != "" {
			path = parentPath + "/" + cat.Slug
		}

		kids := childrenByParent[cat.ID]
		sort.Slice(kids, func(i, j int) bool { return categorySort(kids[i], kids[j]) })
		childNodes := make([]CategoryNode, 0, len(kids))
		for _, k := range kids {
			childNodes = append(childNodes, walk(k, path))
		}
		return buildNode(cat, path, childNodes)
	}

	out := make([]CategoryNode, 0, len(roots))
	for _, r := range roots {
		out = append(out, walk(r, ""))
	}
	return out
}

// FlattenCategoryTree flattens a tree (preorder) into a slice.
func FlattenCategoryTree(tree []CategoryNode) []CategoryNode {
	out := make([]CategoryNode, 0)
	var walk func(nodes []CategoryNode)
	walk = func(nodes []CategoryNode) {
		for _, n := range nodes {
			out = append(out, n)
			if len(n.Children) > 0 {
				walk(n.Children)
			}
		}
	}
	walk(tree)
	return out
}
