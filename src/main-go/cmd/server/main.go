package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"library-squirrel/internal/config"
	"library-squirrel/internal/database"
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

	// 初始化模块
	modules := InitModules(database.GetDB(), r)
	_ = modules // 后续扩展使用

	// 发送启动完成信号
	fmt.Printf("MAIN_READY\n")
	port := cfg.Server.Port

	// 2. 创建 http.Server 实例
	// 注意：不要直接用 r.Run()，要用这个结构体才能调用 Shutdown
	srv := &http.Server{
		Addr:    ":" + strconv.Itoa(port),
		Handler: r,
	}

	// 3. 【关键】在后台启动服务
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			sugar.Fatalf("启动失败: %v", err)
		}
	}()

	// 4. 程序退出逻辑
	shutDownBackground := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			fmt.Printf("关闭出错: %v", err)
		}
		fmt.Println("服务已安全退出")
		os.Exit(0) // 主动退出
	}

	if runtime.GOOS == "windows" {
		// 退出后台任务接口，在windows中使用
		r.GET("/shutdown", func(c *gin.Context) {
			c.String(200, "正在关闭...")
			// 在另一个 goroutine 中关闭，防止当前请求处理阻塞
			go func() { shutDownBackground() }()
		})
	}
	// 主线程监听退出信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	fmt.Println("开始监听退出信号")
	<-quit // 阻塞在这里，直到收到信号
	fmt.Println("收到信号，准备关闭服务...")
	shutDownBackground()
}
