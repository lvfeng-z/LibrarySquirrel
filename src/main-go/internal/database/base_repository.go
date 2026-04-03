package database

import (
	"context"
	"library-squirrel/pkg/model"
)

// BaseRepository 泛型基础仓储接口
// 所有业务模块的 Repository 应嵌入此接口
// T 必须实现 Entity 接口（通过嵌入 BaseEntity 获得）
type BaseRepository[T model.Entity] interface {
	// Save 保存单个实体
	Save(ctx context.Context, entity *T) error
	// SaveBatch 批量保存
	SaveBatch(ctx context.Context, entities []*T) error
	// Delete 根据ID删除
	Delete(ctx context.Context, id int64) error
	// DeleteBatch 批量删除
	DeleteBatch(ctx context.Context, ids []int64) error
	// Update 更新实体
	Update(ctx context.Context, entity *T) error
	// UpdateBatch 批量更新
	UpdateBatch(ctx context.Context, entities []*T) error
	// GetById 根据ID获取
	GetById(ctx context.Context, id int64) (*T, error)
	// Get 根据查询条件获取单个
	Get(ctx context.Context, example *model.Example) (*T, error)
	// List 根据查询条件获取列表
	List(ctx context.Context, example *model.Example) ([]*T, error)
	// Count 统计数量
	Count(ctx context.Context, example *model.Example) (int64, error)
}
