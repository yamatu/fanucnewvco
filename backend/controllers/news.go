package controllers

import (
	"encoding/json"
	"fanuc-backend/config"
	"fanuc-backend/models"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// NewsController provides CRUD endpoints for news articles.
type NewsController struct{}

// helper: preload relations
func withArticlePreloads(db *gorm.DB) *gorm.DB {
	return db.Preload("Author").Preload("Translations")
}

// slugify creates a URL-safe slug from a title string.
func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	re := regexp.MustCompile(`[^a-z0-9]+`)
	s = re.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "article"
	}
	return s
}

// ensureUniqueSlug appends -2, -3, … if the slug already exists.
func ensureUniqueSlug(db *gorm.DB, slug string, excludeID uint) string {
	base := slug
	suffix := 1
	for {
		var count int64
		q := db.Model(&models.Article{}).Where("slug = ?", slug)
		if excludeID > 0 {
			q = q.Where("id != ?", excludeID)
		}
		q.Count(&count)
		if count == 0 {
			return slug
		}
		suffix++
		slug = base + "-" + strconv.Itoa(suffix)
	}
}

// ---------------------------------------------------------------------------
// PUBLIC: GET /public/news?page=&page_size=&search=
// ---------------------------------------------------------------------------

func (nc *NewsController) GetPublicArticles(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "12"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 12
	}

	q := withArticlePreloads(db).Where("is_published = ?", true)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		q = q.Where("title LIKE ? OR summary LIKE ?", like, like)
	}
	if c.Query("is_featured") == "true" {
		q = q.Where("is_featured = ?", true)
	}

	var total int64
	q.Model(&models.Article{}).Count(&total)

	var articles []models.Article
	q.Order("sort_order DESC, published_at DESC, created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&articles)

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "OK",
		Data: models.PaginationResponse{
			Data:       articles,
			Page:       page,
			PageSize:   pageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// ---------------------------------------------------------------------------
// PUBLIC: GET /public/news/:id
// ---------------------------------------------------------------------------

func (nc *NewsController) GetPublicArticle(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid ID"})
		return
	}

	var article models.Article
	if err := withArticlePreloads(db).Where("id = ? AND is_published = ?", id, true).First(&article).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Article not found"})
		return
	}

	// Increment view count
	db.Model(&article).UpdateColumn("view_count", gorm.Expr("view_count + 1"))

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: article})
}

// ---------------------------------------------------------------------------
// PUBLIC: GET /public/news/slug/:slug
// ---------------------------------------------------------------------------

func (nc *NewsController) GetPublicArticleBySlug(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	slug := c.Param("slug")
	var article models.Article
	if err := withArticlePreloads(db).Where("slug = ? AND is_published = ?", slug, true).First(&article).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Article not found"})
		return
	}

	// Increment view count
	db.Model(&article).UpdateColumn("view_count", gorm.Expr("view_count + 1"))

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: article})
}

// ---------------------------------------------------------------------------
// ADMIN: GET /admin/news?page=&page_size=&search=&is_published=
// ---------------------------------------------------------------------------

func (nc *NewsController) GetArticles(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	q := withArticlePreloads(db)

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		q = q.Where("title LIKE ? OR summary LIKE ? OR content LIKE ?", like, like, like)
	}
	if pub := c.Query("is_published"); pub != "" {
		q = q.Where("is_published = ?", pub == "true" || pub == "1")
	}
	if c.Query("is_featured") == "true" {
		q = q.Where("is_featured = ?", true)
	}

	var total int64
	q.Model(&models.Article{}).Count(&total)

	var articles []models.Article
	q.Order("sort_order DESC, created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&articles)

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "OK",
		Data: models.PaginationResponse{
			Data:       articles,
			Page:       page,
			PageSize:   pageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// ---------------------------------------------------------------------------
// ADMIN: GET /admin/news/:id
// ---------------------------------------------------------------------------

func (nc *NewsController) GetArticle(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid ID"})
		return
	}

	var article models.Article
	if err := withArticlePreloads(db).First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Article not found"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OK", Data: article})
}

// ---------------------------------------------------------------------------
// ADMIN: POST /admin/news
// ---------------------------------------------------------------------------

func (nc *NewsController) CreateArticle(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	var req models.ArticleCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}

	// Slug
	slug := req.Slug
	if slug == "" {
		slug = slugify(req.Title)
	}
	slug = ensureUniqueSlug(db, slug, 0)

	// Image URLs JSON
	imageURLsJSON := "[]"
	if len(req.ImageURLs) > 0 {
		b, _ := json.Marshal(req.ImageURLs)
		imageURLsJSON = string(b)
	}

	// Author from JWT context
	userID, _ := c.Get("userID")
	authorID := uint(0)
	switch v := userID.(type) {
	case uint:
		authorID = v
	case float64:
		authorID = uint(v)
	}

	var publishedAt *time.Time
	if req.IsPublished {
		now := time.Now()
		publishedAt = &now
	}

	article := models.Article{
		Title:           req.Title,
		Slug:            slug,
		Summary:         req.Summary,
		Content:         req.Content,
		FeaturedImage:   req.FeaturedImage,
		ImageURLs:       imageURLsJSON,
		IsPublished:     req.IsPublished,
		IsFeatured:      req.IsFeatured,
		MetaTitle:       req.MetaTitle,
		MetaDescription: req.MetaDescription,
		MetaKeywords:    req.MetaKeywords,
		AuthorID:        authorID,
		SortOrder:       req.SortOrder,
		PublishedAt:     publishedAt,
	}

	if err := db.Create(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to create article", Error: err.Error()})
		return
	}

	// Translations
	for _, tr := range req.Translations {
		trSlug := tr.Slug
		if trSlug == "" {
			trSlug = slugify(tr.Title)
		}
		trans := models.ArticleTranslation{
			ArticleID:       article.ID,
			LanguageCode:    tr.LanguageCode,
			Title:           tr.Title,
			Slug:            trSlug,
			Summary:         tr.Summary,
			Content:         tr.Content,
			MetaTitle:       tr.MetaTitle,
			MetaDescription: tr.MetaDescription,
			MetaKeywords:    tr.MetaKeywords,
		}
		db.Create(&trans)
	}

	// Reload with preloads
	withArticlePreloads(db).First(&article, article.ID)

	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: "Article created", Data: article})
}

// ---------------------------------------------------------------------------
// ADMIN: PUT /admin/news/:id
// ---------------------------------------------------------------------------

func (nc *NewsController) UpdateArticle(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid ID"})
		return
	}

	var article models.Article
	if err := db.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Article not found"})
		return
	}

	var req models.ArticleCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: err.Error()})
		return
	}

	// Slug
	slug := req.Slug
	if slug == "" {
		slug = slugify(req.Title)
	}
	slug = ensureUniqueSlug(db, slug, article.ID)

	// Image URLs JSON
	imageURLsJSON := "[]"
	if len(req.ImageURLs) > 0 {
		b, _ := json.Marshal(req.ImageURLs)
		imageURLsJSON = string(b)
	}

	// Handle published_at
	if req.IsPublished && article.PublishedAt == nil {
		now := time.Now()
		article.PublishedAt = &now
	}

	updates := map[string]interface{}{
		"title":            req.Title,
		"slug":             slug,
		"summary":          req.Summary,
		"content":          req.Content,
		"featured_image":   req.FeaturedImage,
		"image_urls":       imageURLsJSON,
		"is_published":     req.IsPublished,
		"is_featured":      req.IsFeatured,
		"meta_title":       req.MetaTitle,
		"meta_description": req.MetaDescription,
		"meta_keywords":    req.MetaKeywords,
		"sort_order":       req.SortOrder,
		"published_at":     article.PublishedAt,
	}

	if err := db.Model(&article).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to update article", Error: err.Error()})
		return
	}

	// Replace translations
	db.Where("article_id = ?", article.ID).Delete(&models.ArticleTranslation{})
	for _, tr := range req.Translations {
		trSlug := tr.Slug
		if trSlug == "" {
			trSlug = slugify(tr.Title)
		}
		trans := models.ArticleTranslation{
			ArticleID:       article.ID,
			LanguageCode:    tr.LanguageCode,
			Title:           tr.Title,
			Slug:            trSlug,
			Summary:         tr.Summary,
			Content:         tr.Content,
			MetaTitle:       tr.MetaTitle,
			MetaDescription: tr.MetaDescription,
			MetaKeywords:    tr.MetaKeywords,
		}
		db.Create(&trans)
	}

	// Reload
	withArticlePreloads(db).First(&article, article.ID)

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Article updated", Data: article})
}

// ---------------------------------------------------------------------------
// ADMIN: DELETE /admin/news/:id
// ---------------------------------------------------------------------------

func (nc *NewsController) DeleteArticle(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Database not initialized"})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid ID"})
		return
	}

	var article models.Article
	if err := db.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Article not found"})
		return
	}

	// Delete translations first
	db.Where("article_id = ?", article.ID).Delete(&models.ArticleTranslation{})
	db.Delete(&article)

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Article deleted"})
}
