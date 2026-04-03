package work

import (
	"context"

	"library-squirrel/internal/database"
	domain "library-squirrel/internal/model"
	"library-squirrel/pkg/model"
)

// Repository 作品仓储接口
type Repository interface {
	database.BaseRepository[domain.Work]

	// Page 分页查询（便捷方法）
	Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.Work, int64, error)

	// GetBySiteAndSiteWorkID 根据站点和站点作品ID查询
	GetBySiteAndSiteWorkID(ctx context.Context, siteId int64, siteWorkId string) (*domain.Work, error)
}
