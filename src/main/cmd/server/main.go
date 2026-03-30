package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"library-squirrel/internal/user"
	"library-squirrel/internal/order"
)

func main() {
	// 初始化 zap 日志
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	sugar := logger.Sugar()

	// 初始化 viper 配置
	viper.SetDefault("server.port", 8080)

	// 初始化 GORM SQLite
	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		logger.Fatal("failed to connect database")
	}
	_ = db

	sugar.Infof("Database connected")

	// 初始化各业务模块路由
	r := gin.Default()

	user.RegisterRoutes(r)
	order.RegisterRoutes(r)

	port := viper.GetInt("server.port")
	log.Printf("Server starting on http://localhost:%d", port)
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}