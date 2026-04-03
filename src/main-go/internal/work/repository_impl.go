package work

import (
	"context"

	"gorm.io/gorm"
	"library-squirrel/internal/database"
	domain "library-squirrel/internal/model"
	"library-squirrel/pkg/model"
)

// workRepository 作品仓储实现
type workRepository struct {
	*database.BaseRepositoryImpl[domain.Work]
}

// NewRepository 创建作品仓储
func NewRepository(db *gorm.DB) Repository {
	return &workRepository{
		BaseRepositoryImpl: database.NewBaseRepository[domain.Work](db),
	}
}

// GORM 返回底层 GORM DB 实例
func (r *workRepository) GORM() *gorm.DB {
	return r.BaseRepositoryImpl.GORM()
}

// Page 分页查询
func (r *workRepository) Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.Work, int64, error) {
	return r.BaseRepositoryImpl.Page(ctx, page, pageSize, example)
}

// GetBySiteAndSiteWorkID 根据站点和站点作品ID查询
func (r *workRepository) GetBySiteAndSiteWorkID(ctx context.Context, siteId int64, siteWorkId string) (*domain.Work, error) {
	return r.BaseRepositoryImpl.Get(ctx, model.NewExample().
		WithCondition("site_id", "=", siteId).
		WithCondition("site_work_id", "=", siteWorkId))
}
