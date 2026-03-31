package localTag

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"library-squirrel/pkg/model"
)

// localTagRepository 本地标签仓储实现
type localTagRepository struct {
	db *gorm.DB
}

// NewRepository 创建本地标签仓储
func NewRepository(db *gorm.DB) Repository {
	return &localTagRepository{
		db: db,
	}
}

// Save 保存
func (r *localTagRepository) Save(ctx context.Context, tag *LocalTag) error {
	return r.db.WithContext(ctx).Create(tag).Error
}

// SaveBatch 批量保存
func (r *localTagRepository) SaveBatch(ctx context.Context, tags []*LocalTag) error {
	if len(tags) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).CreateInBatches(tags, 100).Error
}

// Delete 删除
func (r *localTagRepository) Delete(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Delete(&LocalTag{}, id).Error
}

// DeleteBatch 批量删除
func (r *localTagRepository) DeleteBatch(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Delete(&LocalTag{}, ids).Error
}

// Update 更新
func (r *localTagRepository) Update(ctx context.Context, tag *LocalTag) error {
	return r.db.WithContext(ctx).Save(tag).Error
}

// UpdateBatch 批量更新
func (r *localTagRepository) UpdateBatch(ctx context.Context, tags []*LocalTag) error {
	if len(tags) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Save(tags).Error
}

// GetById 根据ID获取
func (r *localTagRepository) GetById(ctx context.Context, id int64) (*LocalTag, error) {
	var tag LocalTag
	if err := r.db.WithContext(ctx).First(&tag, id).Error; err != nil {
		return nil, err
	}
	return &tag, nil
}

// Get 获取单个
func (r *localTagRepository) Get(ctx context.Context, example *model.Example) (*LocalTag, error) {
	var tag LocalTag
	query := r.db.WithContext(ctx).Model(&LocalTag{})
	query = r.applyExample(query, example)
	if err := query.First(&tag).Error; err != nil {
		return nil, err
	}
	return &tag, nil
}

// List 获取列表
func (r *localTagRepository) List(ctx context.Context, example *model.Example) ([]*LocalTag, error) {
	var tags []*LocalTag
	query := r.db.WithContext(ctx).Model(&LocalTag{})
	query = r.applyExample(query, example)
	if err := query.Find(&tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}

// Count 统计
func (r *localTagRepository) Count(ctx context.Context, example *model.Example) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&LocalTag{})
	query = r.applyExample(query, example)
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// SelectTreeNode 递归查询子标签
// 注意：SQLite CTE 是必需的，GORM 不直接支持
func (r *localTagRepository) SelectTreeNode(ctx context.Context, rootId int64, depth int) ([]*LocalTag, error) {
	if depth <= 0 {
		depth = 10
	}

	statement := fmt.Sprintf(`WITH RECURSIVE treeNode AS
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
		SELECT id, local_tag_name, base_local_tag_id, last_use, create_time, update_time FROM treeNode`)

	var results []*LocalTag
	if err := r.db.WithContext(ctx).Raw(statement, rootId, depth).Scan(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

// SelectParentNode 递归查询上级标签
// 注意：SQLite CTE 是必需的，GORM 不直接支持
func (r *localTagRepository) SelectParentNode(ctx context.Context, nodeId int64) ([]*LocalTag, error) {
	statement := `WITH RECURSIVE parentNode AS
		(
			SELECT *
			FROM local_tag
			WHERE id = ?
			UNION ALL
			SELECT local_tag.*
			FROM local_tag
				JOIN parentNode ON local_tag.id = parentNode.base_local_tag_id
		)
		SELECT * FROM parentNode`

	var results []*LocalTag
	if err := r.db.WithContext(ctx).Raw(statement, nodeId).Scan(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

// ListByWorkId 查询作品关联的本地标签
// 使用 GORM 的 Joins 而非手写 JOIN 字符串
func (r *localTagRepository) ListByWorkId(ctx context.Context, workId int64) ([]*LocalTag, error) {
	var results []*LocalTag
	err := r.db.WithContext(ctx).
		Table("local_tag").
		Joins("JOIN re_work_tag ON local_tag.id = re_work_tag.local_tag_id").
		Where("re_work_tag.work_id = ?", workId).
		Find(&results).Error
	if err != nil {
		return nil, err
	}
	return results, nil
}

// applyExample 应用查询条件 - 使用 GORM 的链式 API
func (r *localTagRepository) applyExample(query *gorm.DB, example *model.Example) *gorm.DB {
	// 应用 WHERE 条件
	for _, cond := range example.Where {
		query = r.applyCondition(query, cond)
	}

	// 应用 OR 条件
	if len(example.Or) > 0 {
		for i, cond := range example.Or {
			if i == 0 {
				query = r.applyCondition(query, cond)
			} else {
				query = query.Or(r.buildOrClause(cond))
			}
		}
	}

	// 排序
	if len(example.OrderBy) > 0 {
		for _, order := range example.OrderBy {
			dir := "ASC"
			if !order.Asc {
				dir = "DESC"
			}
			query = query.Order(order.Field + " " + dir)
		}
	}

	// 分页
	if example.Limit > 0 {
		query = query.Limit(example.Limit)
	}
	if example.Offset > 0 {
		query = query.Offset(example.Offset)
	}

	return query
}

// applyCondition 应用单个条件 - 使用 GORM 的链式 API
func (r *localTagRepository) applyCondition(query *gorm.DB, cond model.Condition) *gorm.DB {
	switch cond.Op {
	case "=":
		return query.Where(cond.Field, cond.Value)
	case "!=":
		return query.Not(cond.Field, cond.Value)
	case ">":
		return query.Where(cond.Field+" > ?", cond.Value)
	case ">=":
		return query.Where(cond.Field+" >= ?", cond.Value)
	case "<":
		return query.Where(cond.Field+" < ?", cond.Value)
	case "<=":
		return query.Where(cond.Field+" <= ?", cond.Value)
	case "LIKE":
		return query.Where(cond.Field+" LIKE ?", cond.Value)
	case "IN":
		return query.Where(cond.Field+" IN ?", toInterfaceSlice(cond.Value))
	case "IS_NULL":
		return query.Where(cond.Field + " IS NULL")
	case "IS_NOT_NULL":
		return query.Where(cond.Field + " IS NOT NULL")
	case "BETWEEN":
		return query.Where(cond.Field+" BETWEEN ? AND ?", toInterfaceSlice(cond.Value)...)
	}
	return query
}

// buildOrClause 构建 OR 条件
func (r *localTagRepository) buildOrClause(cond model.Condition) interface{} {
	switch cond.Op {
	case "=":
		return cond.Field + " = ?"
	case "!=":
		return cond.Field + " != ?"
	case ">":
		return cond.Field + " > ?"
	case ">=":
		return cond.Field + " >= ?"
	case "<":
		return cond.Field + " < ?"
	case "<=":
		return cond.Field + " <= ?"
	case "LIKE":
		return cond.Field + " LIKE ?"
	case "IN":
		return cond.Field + " IN ?"
	}
	return cond.Field + " = ?"
}

// toInterfaceSlice 将任意类型的 slice 转换为 []interface{}
func toInterfaceSlice(v interface{}) []interface{} {
	if v == nil {
		return nil
	}
	switch val := v.(type) {
	case []interface{}:
		return val
	case []int64:
		result := make([]interface{}, len(val))
		for i, v := range val {
			result[i] = v
		}
		return result
	case []string:
		result := make([]interface{}, len(val))
		for i, v := range val {
			result[i] = v
		}
		return result
	}
	return nil
}
