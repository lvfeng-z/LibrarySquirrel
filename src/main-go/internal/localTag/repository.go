package localTag

import (
	"context"

	"library-squirrel/internal/database"
	"library-squirrel/pkg/model"
)

// Repository 本地标签仓储接口
// 嵌入 BaseRepository[LocalTag] 获得基础 CRUD 实现
type Repository interface {
	database.BaseRepository[LocalTag]

	// SelectTreeNode 递归查询子标签
	SelectTreeNode(ctx context.Context, rootId int64, depth int) ([]*LocalTag, error)

	// SelectParentNode 递归查询上级标签
	SelectParentNode(ctx context.Context, nodeId int64) ([]*LocalTag, error)

	// ListByWorkId 查询作品关联的本地标签
	ListByWorkId(ctx context.Context, workId int64) ([]*LocalTag, error)

	// Page 分页查询（便捷方法）
	Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*LocalTag, int64, error)
}
