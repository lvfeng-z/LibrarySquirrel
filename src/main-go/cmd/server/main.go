package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"library-squirrel/internal/config"
	"library-squirrel/internal/database"
	"library-squirrel/internal/localTag"
	"library-squirrel/internal/migration"
)

func main() {
	// 初始化 zap 日志
	logger, _ := zap.NewProduction()
	defer func(logger *zap.Logger) {
		err := logger.Sync()
		if err != nil {
			println(err.Error())
			return
		}
	}(logger)
	sugar := logger.Sugar()

	// 加载配置
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	sugar.Infof("Config loaded: server.port=%d", cfg.Server.Port)

	// 初始化数据库
	if err := database.Init(cfg.Database.Path); err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}
	sugar.Infof("Database initialized: %s", cfg.Database.Path)
	defer func() {
		err := database.Close()
		if err != nil {
			log.Fatalf("Failed to close database: %v", err)
		}
	}()

	// 自动迁移表结构
	if err := migration.AutoMigrate(database.GetDB()); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	sugar.Info("Database migrated")

	// 初始化 Gin
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// 注册业务模块路由
	localTagRepo := localTag.NewRepository(database.GetDB())
	localTagSvc := localTag.NewService(localTagRepo)
	localTagHandler := localTag.NewHandler(localTagSvc)
	localTagHandler.RegisterRoutes(r)

	port := cfg.Server.Port
	log.Printf("Server starting on http://localhost:%d", port)
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
