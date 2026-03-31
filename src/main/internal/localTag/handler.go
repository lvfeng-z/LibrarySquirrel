package localTag

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"library-squirrel/pkg/model"
)

// Handler HTTP处理器
type Handler struct {
	service *Service
}

// NewHandler 创建处理器
func NewHandler(db *gorm.DB) *Handler {
	return &Handler{
		service: NewService(NewRepository(db)),
	}
}

// RegisterRoutes 注册路由
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	g := r.Group("/api/localTag")
	{
		g.GET("/:id", h.GetById)
		g.GET("/list", h.List)
		g.GET("/tree", h.GetTree)
		g.POST("/save", h.Save)
		g.POST("/update", h.Update)
		g.POST("/delete", h.Delete)
	}
}

// GetById 获取单个标签
func (h *Handler) GetById(c *gin.Context) {
	idStr := c.Param("id")
	var id int64
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
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

// List 查询列表
func (h *Handler) List(c *gin.Context) {
	c.JSON(http.StatusOK, model.Success(nil))
}

// GetTree 获取树形结构
func (h *Handler) GetTree(c *gin.Context) {
	c.JSON(http.StatusOK, model.Success(nil))
}

// Save 保存标签
func (h *Handler) Save(c *gin.Context) {
	c.JSON(http.StatusOK, model.Success(nil))
}

// Update 更新标签
func (h *Handler) Update(c *gin.Context) {
	c.JSON(http.StatusOK, model.Success(nil))
}

// Delete 删除标签
func (h *Handler) Delete(c *gin.Context) {
	c.JSON(http.StatusOK, model.Success(nil))
}
