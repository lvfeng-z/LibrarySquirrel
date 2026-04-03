package siteTag

import (
	"context"
	"fmt"
	"strings"

	"gorm.io/gorm"
	"library-squirrel/internal/database"
	domain "library-squirrel/internal/model"
	"library-squirrel/pkg/model"
)

// siteTagRepository 站点标签仓储实现
type siteTagRepository struct {
	*database.BaseRepositoryImpl[domain.SiteTag]
}

// NewRepository 创建站点标签仓储
func NewRepository(db *gorm.DB) Repository {
	return &siteTagRepository{
		BaseRepositoryImpl: database.NewBaseRepository[domain.SiteTag](db),
	}
}

// GORM 返回底层 GORM DB 实例
func (r *siteTagRepository) GORM() *gorm.DB {
	return r.BaseRepositoryImpl.GORM()
}

// Page 分页查询
func (r *siteTagRepository) Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.SiteTag, int64, error) {
	return r.BaseRepositoryImpl.Page(ctx, page, pageSize, example)
}

// ListByWorkId 查询作品的站点标签
func (r *siteTagRepository) ListByWorkId(ctx context.Context, workId int64) ([]*domain.SiteTag, error) {
	query := `
		SELECT t1.*
		FROM site_tag t1
		INNER JOIN re_work_tag t2 ON t1.id = t2.site_tag_id
		WHERE t2.work_id = ?
	`

	var results []*domain.SiteTag
	err := r.GORM().WithContext(ctx).Raw(query, workId).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}

// ListBySiteTagIds 根据站点标签ID列表查询
func (r *siteTagRepository) ListBySiteTagIds(ctx context.Context, siteTagIds []int64) ([]*domain.SiteTag, error) {
	if len(siteTagIds) == 0 {
		return make([]*domain.SiteTag, 0), nil
	}

	placeholders := make([]string, len(siteTagIds))
	args := make([]interface{}, len(siteTagIds))
	for i, id := range siteTagIds {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf(`SELECT * FROM site_tag WHERE id IN (%s)`, strings.Join(placeholders, ","))

	var results []*domain.SiteTag
	err := r.GORM().WithContext(ctx).Raw(query, args...).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}

// UpdateBindLocalTag 绑定本地标签
func (r *siteTagRepository) UpdateBindLocalTag(ctx context.Context, localTagId int64, siteTagIds []int64) (int64, error) {
	if len(siteTagIds) == 0 {
		return 0, nil
	}

	placeholders := make([]string, len(siteTagIds))
	args := make([]interface{}, len(siteTagIds))
	for i, id := range siteTagIds {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf(`UPDATE site_tag SET local_tag_id = ? WHERE id IN (%s)`, strings.Join(placeholders, ","))
	args = append([]interface{}{localTagId}, args...)

	result := r.GORM().WithContext(ctx).Exec(query, args...)
	if result.Error != nil {
		return 0, result.Error
	}

	return result.RowsAffected, nil
}
