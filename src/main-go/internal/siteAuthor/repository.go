package siteAuthor

import (
	"context"

	"library-squirrel/internal/database"
	domain "library-squirrel/internal/model"
	"library-squirrel/pkg/model"
)

// Repository 站点作者仓储接口
type Repository interface {
	database.BaseRepository[domain.SiteAuthor]

	// Page 分页查询（便捷方法）
	Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.SiteAuthor, int64, error)

	// ListByWorkId 查询作品的站点作者
	ListByWorkId(ctx context.Context, workId int64) ([]*model.RankedSiteAuthor, error)

	// ListBySiteAuthorIds 根据站点作者ID列表查询
	ListBySiteAuthorIds(ctx context.Context, siteAuthorIds []int64) ([]*domain.SiteAuthor, error)

	// ListRankedSiteAuthorWithWorkIdByWorkIds 查询多个作品的站点作者列表
	ListRankedSiteAuthorWithWorkIdByWorkIds(ctx context.Context, workIds []int64) ([]*model.RankedSiteAuthorWithWorkId, error)

	// UpdateBindLocalAuthor 绑定本地作者
	UpdateBindLocalAuthor(ctx context.Context, localAuthorId int64, siteAuthorIds []int64) (int64, error)
}
