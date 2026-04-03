package siteAuthor

import (
	"context"
	"fmt"
	"strings"

	"gorm.io/gorm"
	"library-squirrel/internal/database"
	domain "library-squirrel/internal/model"
	"library-squirrel/pkg/model"
)

// siteAuthorRepository 站点作者仓储实现
type siteAuthorRepository struct {
	*database.BaseRepositoryImpl[domain.SiteAuthor]
}

// NewRepository 创建站点作者仓储
func NewRepository(db *gorm.DB) Repository {
	return &siteAuthorRepository{
		BaseRepositoryImpl: database.NewBaseRepository[domain.SiteAuthor](db),
	}
}

// GORM 返回底层 GORM DB 实例
func (r *siteAuthorRepository) GORM() *gorm.DB {
	return r.BaseRepositoryImpl.GORM()
}

// Page 分页查询
func (r *siteAuthorRepository) Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.SiteAuthor, int64, error) {
	return r.BaseRepositoryImpl.Page(ctx, page, pageSize, example)
}

// ListByWorkId 查询作品的站点作者
func (r *siteAuthorRepository) ListByWorkId(ctx context.Context, workId int64) ([]*model.RankedSiteAuthor, error) {
	query := `
		SELECT t1.id, t1.site_id, t1.site_author_id, t1.author_name, t1.fixed_author_name,
		       t1.site_author_name_before, t1.introduce, t1.local_author_id, t1.last_use,
		       t1.create_time, t1.update_time, t2.author_rank
		FROM site_author t1
		INNER JOIN re_work_author t2 ON t1.id = t2.site_author_id
		WHERE t2.work_id = ?
	`

	var results []*model.RankedSiteAuthor
	err := r.GORM().WithContext(ctx).Raw(query, workId).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}

// ListBySiteAuthorIds 根据站点作者ID列表查询
func (r *siteAuthorRepository) ListBySiteAuthorIds(ctx context.Context, siteAuthorIds []int64) ([]*domain.SiteAuthor, error) {
	if len(siteAuthorIds) == 0 {
		return make([]*domain.SiteAuthor, 0), nil
	}

	placeholders := make([]string, len(siteAuthorIds))
	args := make([]interface{}, len(siteAuthorIds))
	for i, id := range siteAuthorIds {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf(`SELECT * FROM site_author WHERE id IN (%s)`, strings.Join(placeholders, ","))

	var results []*domain.SiteAuthor
	err := r.GORM().WithContext(ctx).Raw(query, args...).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}

// ListRankedSiteAuthorWithWorkIdByWorkIds 查询多个作品的站点作者列表
func (r *siteAuthorRepository) ListRankedSiteAuthorWithWorkIdByWorkIds(ctx context.Context, workIds []int64) ([]*model.RankedSiteAuthorWithWorkId, error) {
	if len(workIds) == 0 {
		return make([]*model.RankedSiteAuthorWithWorkId, 0), nil
	}

	placeholders := make([]string, len(workIds))
	args := make([]interface{}, len(workIds))
	for i, id := range workIds {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT t1.id, t1.site_id, t1.site_author_id, t1.author_name, t1.fixed_author_name,
		       t1.site_author_name_before, t1.introduce, t1.local_author_id, t1.last_use,
		       t1.create_time, t1.update_time, t2.author_rank, t2.work_id
		FROM site_author t1
		INNER JOIN re_work_author t2 ON t1.id = t2.site_author_id
		WHERE t2.work_id IN (%s)
	`, strings.Join(placeholders, ","))

	var results []*model.RankedSiteAuthorWithWorkId
	err := r.GORM().WithContext(ctx).Raw(query, args...).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}

// UpdateBindLocalAuthor 绑定本地作者
func (r *siteAuthorRepository) UpdateBindLocalAuthor(ctx context.Context, localAuthorId int64, siteAuthorIds []int64) (int64, error) {
	if len(siteAuthorIds) == 0 {
		return 0, nil
	}

	placeholders := make([]string, len(siteAuthorIds))
	args := make([]interface{}, len(siteAuthorIds))
	for i, id := range siteAuthorIds {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf(`UPDATE site_author SET local_author_id = ? WHERE id IN (%s)`, strings.Join(placeholders, ","))
	args = append([]interface{}{localAuthorId}, args...)

	result := r.GORM().WithContext(ctx).Exec(query, args...)
	if result.Error != nil {
		return 0, result.Error
	}

	return result.RowsAffected, nil
}
