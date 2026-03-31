package localTag

import (
	"context"

	"library-squirrel/pkg/model"
)

// Repository 本地标签仓储接口
type Repository interface {
	Save(ctx context.Context, tag *LocalTag) error
	SaveBatch(ctx context.Context, tags []*LocalTag) error
	Delete(ctx context.Context, id int64) error
	DeleteBatch(ctx context.Context, ids []int64) error
	Update(ctx context.Context, tag *LocalTag) error
	UpdateBatch(ctx context.Context, tags []*LocalTag) error
	GetById(ctx context.Context, id int64) (*LocalTag, error)
	Get(ctx context.Context, example *model.Example) (*LocalTag, error)
	List(ctx context.Context, example *model.Example) ([]*LocalTag, error)
	Count(ctx context.Context, example *model.Example) (int64, error)

	// SelectTreeNode 递归查询子标签
	SelectTreeNode(ctx context.Context, rootId int64, depth int) ([]*LocalTag, error)

	// SelectParentNode 递归查询上级标签
	SelectParentNode(ctx context.Context, nodeId int64) ([]*LocalTag, error)

	// ListByWorkId 查询作品关联的本地标签
	ListByWorkId(ctx context.Context, workId int64) ([]*LocalTag, error)
}
