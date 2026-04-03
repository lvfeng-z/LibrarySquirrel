package main

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"library-squirrel/internal/localAuthor"
	"library-squirrel/internal/localTag"
	"library-squirrel/internal/work"
)

// Modules 业务模块集合
type Modules struct {
	LocalTag    *localTag.Handler
	LocalAuthor *localAuthor.Handler
	Work        *work.Handler
}

// InitModules 初始化所有业务模块
func InitModules(db *gorm.DB, r *gin.Engine) *Modules {
	modules := &Modules{}

	// localTag 模块
	localTagRepo := localTag.NewRepository(db)
	localTagSvc := localTag.NewService(localTagRepo)
	localTagHandler := localTag.NewHandler(localTagSvc)
	localTagHandler.RegisterRoutes(r)
	modules.LocalTag = localTagHandler

	// localAuthor 模块
	localAuthorRepo := localAuthor.NewRepository(db)
	localAuthorSvc := localAuthor.NewService(localAuthorRepo)
	localAuthorHandler := localAuthor.NewHandler(localAuthorSvc)
	localAuthorHandler.RegisterRoutes(r)
	modules.LocalAuthor = localAuthorHandler

	// work 模块
	workRepo := work.NewRepository(db)
	workSvc := work.NewService(workRepo)
	workHandler := work.NewHandler(workSvc)
	workHandler.RegisterRoutes(r)
	modules.Work = workHandler

	return modules
}
