package siteTag

import (
	"context"

	"library-squirrel/internal/database"
	domain "library-squirrel/internal/model"
	"library-squirrel/pkg/model"
)

// Repository 站点标签仓储接口
type Repository interface {
	database.BaseRepository[domain.SiteTag]

	// Page 分页查询（便捷方法）
	Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.SiteTag, int64, error)

	// ListByWorkId 查询作品的站点标签
	ListByWorkId(ctx context.Context, workId int64) ([]*domain.SiteTag, error)

	// ListBySiteTagIds 根据站点标签ID列表查询
	ListBySiteTagIds(ctx context.Context, siteTagIds []int64) ([]*domain.SiteTag, error)

	// UpdateBindLocalTag 绑定本地标签
	UpdateBindLocalTag(ctx context.Context, localTagId int64, siteTagIds []int64) (int64, error)
}
