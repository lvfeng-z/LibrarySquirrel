package localTag

import (
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
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	example := model.NewExample().
		WithOffset((page-1)*pageSize).
		WithLimit(pageSize).
		WithOrder("id", false) // 按 id 降序

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

	c.JSON(http.StatusOK, model.Success(model.NewPageResponse(tags, total, page, pageSize)))
}

// GetById 获取单个标签
func (h *Handler) GetById(c *gin.Context) {
	idStr := c.Param("id")
	var id int64
	if _, err := strconv.ParseInt(idStr, 10, 64); err != nil {
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
	var id int64
	if _, err := strconv.ParseInt(idStr, 10, 64); err != nil {
		c.JSON(http.StatusBadRequest, model.Error("invalid id"))
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(nil))
}
