package siteTag

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
	g := r.Group("/api/siteTag")
	{
		g.GET("/page", h.Page)
		g.GET("/:id", h.GetById)
		g.POST("/save", h.Save)
		g.POST("/saveBatch", h.SaveBatch)
		g.POST("/update", h.Update)
		g.POST("/delete/:id", h.Delete)
		g.GET("/listByWorkId/:workId", h.ListByWorkId)
		g.POST("/listBySiteTagIds", h.ListBySiteTagIds)
		g.POST("/updateBindLocalTag", h.UpdateBindLocalTag)
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

	tags, err := h.service.List(c.Request.Context(), example)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}

	total, err := h.service.Count(c.Request.Context(), example)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, model.Success(model.NewPage(tags, total, pageNumber, pageSize)))
}

// GetById 获取单个标签
func (h *Handler) GetById(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.Error("invalid id"))
		return
	}
	tag, err := h.service.GetById(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(tag))
}

// Save 保存标签
func (h *Handler) Save(c *gin.Context) {
	var tag domain.SiteTag
	if err := c.ShouldBindJSON(&tag); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}
	if err := h.service.Save(c.Request.Context(), &tag); err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(tag))
}

// SaveBatch 批量保存标签
func (h *Handler) SaveBatch(c *gin.Context) {
	var tags []*domain.SiteTag
	if err := c.ShouldBindJSON(&tags); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}
	if err := h.service.SaveBatch(c.Request.Context(), tags); err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(tags))
}

// Update 更新标签
func (h *Handler) Update(c *gin.Context) {
	var tag domain.SiteTag
	if err := c.ShouldBindJSON(&tag); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}
	if err := h.service.UpdateById(c.Request.Context(), &tag); err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(tag))
}

// Delete 删除标签
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

// ListByWorkId 查询作品的站点标签
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

// ListBySiteTagIds 根据站点标签ID列表查询
func (h *Handler) ListBySiteTagIds(c *gin.Context) {
	var req struct {
		SiteTagIds []int64 `json:"siteTagIds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}

	// 处理逗号分隔的字符串格式
	if len(req.SiteTagIds) == 0 {
		siteTagIdsStr := c.Query("siteTagIds")
		if siteTagIdsStr != "" {
			strs := strings.Split(siteTagIdsStr, ",")
			req.SiteTagIds = make([]int64, 0, len(strs))
			for _, s := range strs {
				if id, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64); err == nil {
					req.SiteTagIds = append(req.SiteTagIds, id)
				}
			}
		}
	}

	result, err := h.service.ListBySiteTagIds(c.Request.Context(), req.SiteTagIds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(result))
}

// UpdateBindLocalTag 绑定本地标签
func (h *Handler) UpdateBindLocalTag(c *gin.Context) {
	var req struct {
		LocalTagId int64   `json:"localTagId"`
		SiteTagIds []int64 `json:"siteTagIds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}

	result, err := h.service.UpdateBindLocalTag(c.Request.Context(), req.LocalTagId, req.SiteTagIds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(result))
}
