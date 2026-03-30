package order

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes 注册订单模块路由
func RegisterRoutes(r *gin.Engine) {
	o := r.Group("/order")
	{
		o.GET("/test", handlerTest)
		o.POST("/create", handlerCreate)
	}
}

func handlerTest(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    "Hello from order module",
	})
}

func handlerCreate(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "create order endpoint",
	})
}