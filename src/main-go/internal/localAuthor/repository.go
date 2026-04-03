package localAuthor

import (
	"context"

	"library-squirrel/internal/database"
	domain "library-squirrel/internal/model"
	"library-squirrel/pkg/model"
)

// Repository 本地作者仓储接口
// 嵌入 BaseRepository[LocalAuthor] 获得基础 CRUD 实现
type Repository interface {
	database.BaseRepository[domain.LocalAuthor]

	// ListReWorkAuthor 批量获取作品与作者的关联
	ListReWorkAuthor(ctx context.Context, workIds []int64) (map[int64][]*model.RankedLocalAuthor, error)

	// ListByWorkId 查询作品的本地作者
	ListByWorkId(ctx context.Context, workId int64) ([]*model.RankedLocalAuthor, error)

	// ListRankedLocalAuthorWithWorkIdByWorkIds 查询多个作品的本地作者列表
	ListRankedLocalAuthorWithWorkIdByWorkIds(ctx context.Context, workIds []int64) ([]*model.RankedLocalAuthorWithWorkId, error)

	// Page 分页查询（便捷方法）
	Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.LocalAuthor, int64, error)
}
