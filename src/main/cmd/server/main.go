package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"library-squirrel/internal/config"
	"library-squirrel/internal/database"
	"library-squirrel/internal/localTag"
)

func main() {
	// 初始化 zap 日志
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	sugar := logger.Sugar()

	// 加载配置
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	sugar.Infof("Config loaded: server.port=%d", cfg.Server.Port)

	// 初始化数据库
	if err := database.Init(&cfg.Database); err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}
	sugar.Infof("Database initialized: %s", cfg.Database.Path)
	defer database.Close()

	// 初始化 Gin
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// 注册业务模块路由
	localTagHandler := localTag.NewHandler(database.GetDB())
	localTagHandler.RegisterRoutes(r)

	port := cfg.Server.Port
	log.Printf("Server starting on http://localhost:%d", port)
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
