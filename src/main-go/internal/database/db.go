package database

import (
	"fmt"
	"sync"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"library-squirrel/internal/config"
)

var (
	db   *gorm.DB
	once sync.Once
)

// Init 初始化数据库连接
func Init(cfg *config.DatabaseConfig) error {
	var err error
	once.Do(func() {
		db, err = gorm.Open(sqlite.Open(cfg.Path), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err != nil {
			err = fmt.Errorf("failed to connect database: %w", err)
			return
		}

		sqlDB, err := db.DB()
		if err != nil {
			err = fmt.Errorf("failed to get sql.DB: %w", err)
			return
		}

		// 设置连接池参数
		sqlDB.SetMaxOpenConns(25)
		sqlDB.SetMaxIdleConns(5)
	})
	return err
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return db
}

// Close 关闭数据库连接
func Close() error {
	if db != nil {
		sqlDB, err := db.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}
