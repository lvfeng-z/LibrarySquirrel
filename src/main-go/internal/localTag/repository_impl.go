package localTag

import (
	"context"

	"gorm.io/gorm"
	"library-squirrel/internal/database"
	"library-squirrel/pkg/model"
)

// localTagRepository 本地标签仓储实现
// 嵌入 database.BaseRepositoryImpl[LocalTag] 获得基础 CRUD 实现
type localTagRepository struct {
	*database.BaseRepositoryImpl[LocalTag]
}

// NewRepository 创建本地标签仓储
func NewRepository(db *gorm.DB) Repository {
	return &localTagRepository{
		BaseRepositoryImpl: database.NewBaseRepository[LocalTag](db),
	}
}

// GORM 返回底层 GORM DB 实例（供特殊查询使用）
func (r *localTagRepository) GORM() *gorm.DB {
	return r.BaseRepositoryImpl.GORM()
}

// SelectTreeNode 递归查询子标签
func (r *localTagRepository) SelectTreeNode(ctx context.Context, rootId int64, depth int) ([]*LocalTag, error) {
	if depth <= 0 {
		depth = 10
	}

	// 使用 GORM Raw 执行递归 CTE 查询
	query := `
		WITH RECURSIVE treeNode AS
		(
			SELECT *, 1 AS level, NOT EXISTS(SELECT 1 FROM local_tag WHERE base_local_tag_id = t1.id) AS isLeaf
			FROM local_tag t1
			WHERE base_local_tag_id = ?
			UNION ALL
			SELECT t1.*, treeNode.level + 1 AS level, NOT EXISTS(SELECT 1 FROM local_tag WHERE base_local_tag_id = t1.id) AS isLeaf
			FROM local_tag t1
			JOIN treeNode ON t1.base_local_tag_id = treeNode.id
			WHERE treeNode.level < ?
		)
		SELECT id, local_tag_name, base_local_tag_id, last_use, create_time, update_time FROM treeNode
	`

	var tags []*LocalTag
	err := r.GORM().WithContext(ctx).Raw(query, rootId, depth).Scan(&tags).Error
	if err != nil {
		return nil, err
	}
	return tags, nil
}

// SelectParentNode 递归查询上级标签
func (r *localTagRepository) SelectParentNode(ctx context.Context, nodeId int64) ([]*LocalTag, error) {
	query := `
		WITH RECURSIVE parentNode AS
		(
			SELECT *
			FROM local_tag
			WHERE id = ?
			UNION ALL
			SELECT local_tag.*
			FROM local_tag
				JOIN parentNode ON local_tag.id = parentNode.base_local_tag_id
		)
		SELECT * FROM parentNode
	`

	var tags []*LocalTag
	err := r.GORM().WithContext(ctx).Raw(query, nodeId).Scan(&tags).Error
	if err != nil {
		return nil, err
	}
	return tags, nil
}

// ListByWorkId 查询作品关联的本地标签
func (r *localTagRepository) ListByWorkId(ctx context.Context, workId int64) ([]*LocalTag, error) {
	query := `
		SELECT t1.id, t1.local_tag_name, t1.base_local_tag_id, t1.last_use, t1.create_time, t1.update_time
		FROM local_tag t1
		INNER JOIN re_work_tag t2 ON t1.id = t2.local_tag_id
		WHERE t2.work_id = ?
	`

	var tags []*LocalTag
	err := r.GORM().WithContext(ctx).Raw(query, workId).Scan(&tags).Error
	if err != nil {
		return nil, err
	}
	return tags, nil
}

// Page 分页查询
func (r *localTagRepository) Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*LocalTag, int64, error) {
	return r.BaseRepositoryImpl.Page(ctx, page, pageSize, example)
}
