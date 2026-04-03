package localTag

import (
	"context"

	"library-squirrel/internal/database"
	domain "library-squirrel/internal/model"
	"library-squirrel/pkg/model"
)

// Repository 本地标签仓储接口
// 嵌入 BaseRepository[domain.LocalTag] 获得基础 CRUD 实现
type Repository interface {
	database.BaseRepository[domain.LocalTag]

	// SelectTreeNode 递归查询子标签
	SelectTreeNode(ctx context.Context, rootId int64, depth int) ([]*domain.LocalTag, error)

	// SelectParentNode 递归查询上级标签
	SelectParentNode(ctx context.Context, nodeId int64) ([]*domain.LocalTag, error)

	// ListByWorkId 查询作品关联的本地标签
	ListByWorkId(ctx context.Context, workId int64) ([]*domain.LocalTag, error)

	// Page 分页查询（便捷方法）
	Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.LocalTag, int64, error)
}
