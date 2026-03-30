package user

import (
	"net/http"

	"go.uber.org/zap"

	"github.com/gin-gonic/gin"
)

var logger *zap.Logger

func init() {
	logger, _ = zap.NewProduction()
}

func RegisterRoutes(r *gin.Engine) {
	u := r.Group("/user")
	{
		u.GET("/test", handlerTest)
		u.POST("/login", handlerLogin)
	}
}

func handlerTest(c *gin.Context) {
	logger.Info("user test called")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    "Hello from user module",
	})
}

func handlerLogin(c *gin.Context) {
	logger.Info("user login called")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "login endpoint",
	})
}