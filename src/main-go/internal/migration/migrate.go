package migration

import (
	"log"

	"library-squirrel/internal/model"

	"gorm.io/gorm"
)

// AutoMigrate 执行数据库自动迁移
func AutoMigrate(db *gorm.DB) error {
	// 定义所有需要迁移的模型（按依赖顺序排列）
	models := []interface{}{
		// 基础表（无外键依赖）
		&model.Backup{},
		&model.LocalAuthor{},
		&model.Site{},
		&model.SiteTag{},
		&model.WorkSet{},
		&model.Work{},
		&model.SiteAuthor{},
		&model.Poi{},
		&model.SecureStorage{},
		&model.Plugin{},
		&model.Task{},
		&model.Resource{},

		// 关联表（有外键依赖）
		&model.ReWorkAuthor{},
		&model.ReWorkTag{},
		&model.ReWorkWorkSet{},
		&model.RePoiTarget{},

		// 本地标签（独立表）
		&model.LocalTag{},
	}

	// 执行自动迁移
	if err := db.AutoMigrate(models...); err != nil {
		return err
	}

	log.Println("Database auto migration completed")
	return nil
}
