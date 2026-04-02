package localTag

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

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
	g := r.Group("/api/localTag")
	{
		g.GET("/page", h.Page)
		g.GET("/:id", h.GetById)
		g.POST("/save", h.Save)
		g.POST("/update", h.Update)
		g.POST("/delete/:id", h.Delete)
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
		Query:      nil, // 可通过查询参数传递
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
	var tag LocalTag
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

// Update 更新标签
func (h *Handler) Update(c *gin.Context) {
	var tag LocalTag
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
