package work

import (
	"encoding/json"
	"net/http"
	"strconv"

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
	g := r.Group("/api/work")
	{
		g.GET("/page", h.Page)
		g.GET("/:id", h.GetById)
		g.POST("/save", h.Save)
		g.POST("/update", h.Update)
		g.POST("/delete/:id", h.Delete)
		g.GET("/getBySiteAndSiteWorkID", h.GetBySiteAndSiteWorkID)
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

	works, err := h.service.List(c.Request.Context(), example)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}

	total, err := h.service.Count(c.Request.Context(), example)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, model.Success(model.NewPage(works, total, pageNumber, pageSize)))
}

// GetById 获取单个作品
func (h *Handler) GetById(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.Error("invalid id"))
		return
	}
	work, err := h.service.GetById(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(work))
}

// Save 保存作品
func (h *Handler) Save(c *gin.Context) {
	var work domain.Work
	if err := c.ShouldBindJSON(&work); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}
	if err := h.service.Save(c.Request.Context(), &work); err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(work))
}

// Update 更新作品
func (h *Handler) Update(c *gin.Context) {
	var work domain.Work
	if err := c.ShouldBindJSON(&work); err != nil {
		c.JSON(http.StatusBadRequest, model.Error(err.Error()))
		return
	}
	if err := h.service.UpdateById(c.Request.Context(), &work); err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(work))
}

// Delete 删除作品
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

// GetBySiteAndSiteWorkID 根据站点和站点作品ID获取作品
func (h *Handler) GetBySiteAndSiteWorkID(c *gin.Context) {
	siteIdStr := c.Query("siteId")
	siteId, err := strconv.ParseInt(siteIdStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, model.Error("invalid siteId"))
		return
	}

	siteWorkId := c.Query("siteWorkId")
	if siteWorkId == "" {
		c.JSON(http.StatusBadRequest, model.Error("siteWorkId is required"))
		return
	}

	work, err := h.service.GetBySiteAndSiteWorkID(c.Request.Context(), siteId, siteWorkId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, model.Success(work))
}
