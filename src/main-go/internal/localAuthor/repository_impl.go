package localAuthor

import (
	"context"
	"fmt"
	"strings"

	"gorm.io/gorm"
	"library-squirrel/internal/database"
	domain "library-squirrel/internal/model"
	"library-squirrel/pkg/model"
)

// localAuthorRepository 本地作者仓储实现
// 嵌入 database.BaseRepositoryImpl[domain.LocalAuthor] 获得基础 CRUD 实现
type localAuthorRepository struct {
	*database.BaseRepositoryImpl[domain.LocalAuthor]
}

// NewRepository 创建本地作者仓储
func NewRepository(db *gorm.DB) Repository {
	return &localAuthorRepository{
		BaseRepositoryImpl: database.NewBaseRepository[domain.LocalAuthor](db),
	}
}

// GORM 返回底层 GORM DB 实例（供特殊查询使用）
func (r *localAuthorRepository) GORM() *gorm.DB {
	return r.BaseRepositoryImpl.GORM()
}

// ListReWorkAuthor 批量获取作品与作者的关联
func (r *localAuthorRepository) ListReWorkAuthor(ctx context.Context, workIds []int64) (map[int64][]*model.RankedLocalAuthor, error) {
	if len(workIds) == 0 {
		return make(map[int64][]*model.RankedLocalAuthor), nil
	}

	// 构建 IN 子句
	placeholders := make([]string, len(workIds))
	args := make([]interface{}, len(workIds))
	for i, id := range workIds {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT t2.work_id, t1.id, t1.author_name, t1.introduce, t1.last_use, t1.create_time, t1.update_time, t2.author_rank
		FROM local_author t1
		INNER JOIN re_work_author t2 ON t1.id = t2.local_author_id
		WHERE t2.work_id IN (%s)
	`, strings.Join(placeholders, ","))

	var results []*struct {
		WorkID int64 `gorm:"column:work_id"`
		model.RankedLocalAuthor
	}

	err := r.GORM().WithContext(ctx).Raw(query, args...).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	// 转换为 map
	resultMap := make(map[int64][]*model.RankedLocalAuthor)
	for _, res := range results {
		if _, ok := resultMap[res.WorkID]; !ok {
			resultMap[res.WorkID] = make([]*model.RankedLocalAuthor, 0)
		}
		ranked := res.RankedLocalAuthor
		resultMap[res.WorkID] = append(resultMap[res.WorkID], &ranked)
	}

	return resultMap, nil
}

// ListByWorkId 查询作品的本地作者
func (r *localAuthorRepository) ListByWorkId(ctx context.Context, workId int64) ([]*model.RankedLocalAuthor, error) {
	query := `
		SELECT t1.id, t1.author_name, t1.introduce, t1.last_use, t1.create_time, t1.update_time, t2.author_rank
		FROM local_author t1
		INNER JOIN re_work_author t2 ON t1.id = t2.local_author_id
		WHERE t2.work_id = ?
	`

	var results []*model.RankedLocalAuthor
	err := r.GORM().WithContext(ctx).Raw(query, workId).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}

// ListRankedLocalAuthorWithWorkIdByWorkIds 查询多个作品的本地作者列表
func (r *localAuthorRepository) ListRankedLocalAuthorWithWorkIdByWorkIds(ctx context.Context, workIds []int64) ([]*model.RankedLocalAuthorWithWorkId, error) {
	if len(workIds) == 0 {
		return make([]*model.RankedLocalAuthorWithWorkId, 0), nil
	}

	// 构建 IN 子句
	placeholders := make([]string, len(workIds))
	args := make([]interface{}, len(workIds))
	for i, id := range workIds {
		placeholders[i] = "?"
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT t1.id, t1.author_name, t1.introduce, t1.last_use, t1.create_time, t1.update_time, t2.author_rank, t2.work_id
		FROM local_author t1
		INNER JOIN re_work_author t2 ON t1.id = t2.local_author_id
		WHERE t2.work_id IN (%s)
	`, strings.Join(placeholders, ","))

	var results []*model.RankedLocalAuthorWithWorkId
	err := r.GORM().WithContext(ctx).Raw(query, args...).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}

// Page 分页查询
func (r *localAuthorRepository) Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.LocalAuthor, int64, error) {
	return r.BaseRepositoryImpl.Page(ctx, page, pageSize, example)
}
