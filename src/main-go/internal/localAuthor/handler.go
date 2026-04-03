package localAuthor

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
	g := r.Group("/api/localAuthor")
	{
		g.GET("/page", h.Page)
		g.GET("/:id", h.GetById)
		g.POST("/save", h.Save)
		g.POST("/update", h.Update)
		g.POST("/delete/:id", h.Delete)
		g.POST("/listReWorkAuthor", h.ListReWorkAuthor)
		g.GET("/listByWorkId/:workId", h.ListByWorkId)
		g.POST("/listRankedLocalAuthorWithWorkIdByWorkIds", h.ListRankedLocalAuthorWithWorkIds)
	}
}

// Page 分页查询
func (h *Handler) Page(c *gin.Context) {
	pageNumber, _ := strconv.Atoi(c.DefaultQuery("pageNumber", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	// 构建分页请求
	pageReq := &model.PageRequest{
		PageNumber: pageNumber,
		PageSize:   pageSize,
		Query:      nil,
	}

	// 从查询参数中获取 query（JSON 格式）
	if queryStr := c.Query("query"); queryStr != "" {
		var query map[string]interface{}
		if err := json.Unmarshal([]byte(queryStr), &query); err == nil {
			pageReq.Query = query
		}
	}

	example := pageReq.ToExample()
	example.WithOffset((pageNumber - 1) * pageSize)
	example.WithLimit(pageSize)

	// 如果没有排序，默认按 id 降序
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
	var author domain.LocalAuthor
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

// Update 更新作者
func (h *Handler) Update(c *gin.Context) {
	var author domain.LocalAuthor
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

// ListReWorkAuthor 批量获取作品与作者的关联
func (h *Handler) ListReWorkAuthor(c *gin.Context) {
	var req struct {
		WorkIds []int64 `json:"workIds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}

	result, err := h.service.ListReWorkAuthor(c.Request.Context(), req.WorkIds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(result))
}

// ListByWorkId 查询作品的本地作者
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

// ListRankedLocalAuthorWithWorkIds 查询多个作品的本地作者列表
func (h *Handler) ListRankedLocalAuthorWithWorkIds(c *gin.Context) {
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

	result, err := h.service.ListRankedLocalAuthorWithWorkIdByWorkIds(c.Request.Context(), req.WorkIds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(result))
}
