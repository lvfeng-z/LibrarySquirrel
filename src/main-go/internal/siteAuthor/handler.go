package siteAuthor

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	domain "library-squirrel/internal/model"
	"library-squirrel/pkg/model"
)

// Handler HTTP处理器
type Handler struct {
	service *Service
}

// NewHandler 创建处理器
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes 注册路由
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	g := r.Group("/api/siteAuthor")
	{
		g.GET("/page", h.Page)
		g.GET("/:id", h.GetById)
		g.POST("/save", h.Save)
		g.POST("/saveBatch", h.SaveBatch)
		g.POST("/update", h.Update)
		g.POST("/delete/:id", h.Delete)
		g.GET("/listByWorkId/:workId", h.ListByWorkId)
		g.POST("/listBySiteAuthorIds", h.ListBySiteAuthorIds)
		g.POST("/listRankedSiteAuthorWithWorkIdByWorkIds", h.ListRankedSiteAuthorWithWorkIdByWorkIds)
		g.POST("/updateBindLocalAuthor", h.UpdateBindLocalAuthor)
	}
}

// Page 分页查询
func (h *Handler) Page(c *gin.Context) {
	pageNumber, _ := strconv.Atoi(c.DefaultQuery("pageNumber", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	pageReq := &model.PageRequest{
		PageNumber: pageNumber,
		PageSize:   pageSize,
		Query:      nil,
	}

	if queryStr := c.Query("query"); queryStr != "" {
		var query map[string]interface{}
		if err := json.Unmarshal([]byte(queryStr), &query); err == nil {
			pageReq.Query = query
		}
	}

	example := pageReq.ToExample()
	example.WithOffset((pageNumber - 1) * pageSize)
	example.WithLimit(pageSize)

	if len(example.OrderBy) == 0 {
		example.WithOrder("id", false)
	}

	authors, err := h.service.List(c.Request.Context(), example)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}

	total, err := h.service.Count(c.Request.Context(), example)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, model.Success(model.NewPage(authors, total, pageNumber, pageSize)))
}

// GetById 获取单个作者
func (h *Handler) GetById(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.Error("invalid id"))
		return
	}
	author, err := h.service.GetById(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(author))
}

// Save 保存作者
func (h *Handler) Save(c *gin.Context) {
	var author domain.SiteAuthor
	if err := c.ShouldBindJSON(&author); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}
	if err := h.service.Save(c.Request.Context(), &author); err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(author))
}

// SaveBatch 批量保存作者
func (h *Handler) SaveBatch(c *gin.Context) {
	var authors []*domain.SiteAuthor
	if err := c.ShouldBindJSON(&authors); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}
	if err := h.service.SaveBatch(c.Request.Context(), authors); err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(authors))
}

// Update 更新作者
func (h *Handler) Update(c *gin.Context) {
	var author domain.SiteAuthor
	if err := c.ShouldBindJSON(&author); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}
	if err := h.service.UpdateById(c.Request.Context(), &author); err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(author))
}

// Delete 删除作者
func (h *Handler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.Error("invalid id"))
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(nil))
}

// ListByWorkId 查询作品的站点作者
func (h *Handler) ListByWorkId(c *gin.Context) {
	workIdStr := c.Param("workId")
	workId, err := strconv.ParseInt(workIdStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.Error("invalid workId"))
		return
	}

	result, err := h.service.ListByWorkId(c.Request.Context(), workId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(result))
}

// ListBySiteAuthorIds 根据站点作者ID列表查询
func (h *Handler) ListBySiteAuthorIds(c *gin.Context) {
	var req struct {
		SiteAuthorIds []int64 `json:"siteAuthorIds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}

	// 处理逗号分隔的字符串格式
	if len(req.SiteAuthorIds) == 0 {
		siteAuthorIdsStr := c.Query("siteAuthorIds")
		if siteAuthorIdsStr != "" {
			strs := strings.Split(siteAuthorIdsStr, ",")
			req.SiteAuthorIds = make([]int64, 0, len(strs))
			for _, s := range strs {
				if id, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64); err == nil {
					req.SiteAuthorIds = append(req.SiteAuthorIds, id)
				}
			}
		}
	}

	result, err := h.service.ListBySiteAuthorIds(c.Request.Context(), req.SiteAuthorIds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(result))
}

// ListRankedSiteAuthorWithWorkIdByWorkIds 查询多个作品的站点作者列表
func (h *Handler) ListRankedSiteAuthorWithWorkIdByWorkIds(c *gin.Context) {
	var req struct {
		WorkIds []int64 `json:"workIds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}

	// 处理逗号分隔的字符串格式
	if len(req.WorkIds) == 0 {
		workIdsStr := c.Query("workIds")
		if workIdsStr != "" {
			strs := strings.Split(workIdsStr, ",")
			req.WorkIds = make([]int64, 0, len(strs))
			for _, s := range strs {
				if id, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64); err == nil {
					req.WorkIds = append(req.WorkIds, id)
				}
			}
		}
	}

	result, err := h.service.ListRankedSiteAuthorWithWorkIdByWorkIds(c.Request.Context(), req.WorkIds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(result))
}

// UpdateBindLocalAuthor 绑定本地作者
func (h *Handler) UpdateBindLocalAuthor(c *gin.Context) {
	var req struct {
		LocalAuthorId int64   `json:"localAuthorId"`
		SiteAuthorIds []int64 `json:"siteAuthorIds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}

	result, err := h.service.UpdateBindLocalAuthor(c.Request.Context(), req.LocalAuthorId, req.SiteAuthorIds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(result))
}
