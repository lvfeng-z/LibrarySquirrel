package database

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"library-squirrel/pkg/model"
)

// BaseRepositoryImpl 泛型基础仓储 GORM 实现
// 这是一个抽象基类，具体模块通过嵌入它来获得基础 CRUD 实现
type BaseRepositoryImpl[T model.BaseEntity] struct {
	db *gorm.DB
}

// NewBaseRepository 创建基础仓储实例
func NewBaseRepository[T model.BaseEntity](db *gorm.DB) *BaseRepositoryImpl[T] {
	return &BaseRepositoryImpl[T]{db: db}
}

// Save 保存单个实体
func (r *BaseRepositoryImpl[T]) Save(ctx context.Context, entity *T) error {
	return r.db.WithContext(ctx).Create(entity).Error
}

// SaveBatch 批量保存
func (r *BaseRepositoryImpl[T]) SaveBatch(ctx context.Context, entities []*T) error {
	if len(entities) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(entities).Error
}

// Delete 根据ID删除
func (r *BaseRepositoryImpl[T]) Delete(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Delete(new(T), id).Error
}

// DeleteBatch 批量删除
func (r *BaseRepositoryImpl[T]) DeleteBatch(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Delete(new(T), ids).Error
}

// Update 更新实体
func (r *BaseRepositoryImpl[T]) Update(ctx context.Context, entity *T) error {
	return r.db.WithContext(ctx).Save(entity).Error
}

// UpdateBatch 批量更新
func (r *BaseRepositoryImpl[T]) UpdateBatch(ctx context.Context, entities []*T) error {
	if len(entities) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Save(entities).Error
}

// GetById 根据ID获取
func (r *BaseRepositoryImpl[T]) GetById(ctx context.Context, id int64) (*T, error) {
	var entity T
	err := r.db.WithContext(ctx).First(&entity, id).Error
	if err != nil {
		return nil, err
	}
	return &entity, nil
}

// Get 根据查询条件获取单个
func (r *BaseRepositoryImpl[T]) Get(ctx context.Context, example *model.Example) (*T, error) {
	var entity T
	query := r.buildQuery(example)
	err := query.WithContext(ctx).First(&entity).Error
	if err != nil {
		return nil, err
	}
	return &entity, nil
}

// List 根据查询条件获取列表
func (r *BaseRepositoryImpl[T]) List(ctx context.Context, example *model.Example) ([]*T, error) {
	var entities []*T
	query := r.buildQuery(example)
	err := query.WithContext(ctx).Find(&entities).Error
	if err != nil {
		return nil, err
	}
	return entities, nil
}

// Count 统计数量
func (r *BaseRepositoryImpl[T]) Count(ctx context.Context, example *model.Example) (int64, error) {
	var count int64
	query := r.buildQuery(example)
	err := query.WithContext(ctx).Count(&count).Error
	return count, err
}

// buildQuery 根据 Example 构建查询
func (r *BaseRepositoryImpl[T]) buildQuery(example *model.Example) *gorm.DB {
	db := r.db.Model(new(T))

	// WHERE 条件
	for _, cond := range example.Where {
		db = r.applyCondition(db, cond)
	}

	// OR 条件
	if len(example.Or) > 0 {
		for _, cond := range example.Or {
			db = r.applyCondition(db, cond)
		}
	}

	// 排序
	if len(example.OrderBy) > 0 {
		var orders []clause.OrderByColumn
		for _, order := range example.OrderBy {
			orders = append(orders, clause.OrderByColumn{
				Column: clause.Column{Name: order.Field},
				Desc:   !order.Asc,
			})
		}
		db = db.Order(clause.OrderBy{Columns: orders})
	}

	// 分页
	if example.Limit > 0 {
		db = db.Limit(example.Limit)
		if example.Offset > 0 {
			db = db.Offset(example.Offset)
		}
	}

	return db
}

// applyCondition 应用单个查询条件
func (r *BaseRepositoryImpl[T]) applyCondition(db *gorm.DB, cond model.Condition) *gorm.DB {
	switch cond.Op {
	case "=":
		return db.Where(cond.Field+" = ?", cond.Value)
	case "!=":
		return db.Where(cond.Field+" != ?", cond.Value)
	case ">":
		return db.Where(cond.Field+" > ?", cond.Value)
	case ">=":
		return db.Where(cond.Field+" >= ?", cond.Value)
	case "<":
		return db.Where(cond.Field+" < ?", cond.Value)
	case "<=":
		return db.Where(cond.Field+" <= ?", cond.Value)
	case "LIKE":
		return db.Where(cond.Field+" LIKE ?", cond.Value)
	case "IN":
		return r.applyInCondition(db, cond)
	case "IS_NULL":
		return db.Where(cond.Field + " IS NULL")
	case "IS_NOT_NULL":
		return db.Where(cond.Field + " IS NOT NULL")
	case "BETWEEN":
		return r.applyBetweenCondition(db, cond)
	default:
		return db
	}
}

// applyInCondition 处理 IN 查询
func (r *BaseRepositoryImpl[T]) applyInCondition(db *gorm.DB, cond model.Condition) *gorm.DB {
	vals, ok := cond.Value.([]interface{})
	if !ok || len(vals) == 0 {
		return db
	}
	return db.Where(cond.Field+" IN ?", vals)
}

// applyBetweenCondition 处理 BETWEEN 查询
func (r *BaseRepositoryImpl[T]) applyBetweenCondition(db *gorm.DB, cond model.Condition) *gorm.DB {
	vals, ok := cond.Value.([]interface{})
	if !ok || len(vals) != 2 {
		return db
	}
	return db.Where(cond.Field+" BETWEEN ? AND ?", vals[0], vals[1])
}

// GetDB 获取底层 GORM DB 实例（供特殊查询使用）
func (r *BaseRepositoryImpl[T]) GetDB() *gorm.DB {
	return r.db
}

// GORM 获取底层 GORM DB 实例（别名）
func (r *BaseRepositoryImpl[T]) GORM() *gorm.DB {
	return r.db
}

// Transaction 执行事务
func (r *BaseRepositoryImpl[T]) Transaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}

// ExecRawSQL 执行原生 SQL（仅用于复杂查询）
func (r *BaseRepositoryImpl[T]) ExecRawSQL(ctx context.Context, query string, args ...interface{}) *gorm.DB {
	return r.db.WithContext(ctx).Raw(query, args...)
}

// ========== 辅助方法 ==========

// Create 创建（别名，用于特定场景）
func (r *BaseRepositoryImpl[T]) Create(ctx context.Context, entity *T) error {
	return r.Save(ctx, entity)
}

// Updates 更新（仅更新非零字段）
func (r *BaseRepositoryImpl[T]) Updates(ctx context.Context, entity *T) error {
	return r.db.WithContext(ctx).Model(new(T)).Updates(entity).Error
}

// DeleteByIds 根据IDs删除（别名）
func (r *BaseRepositoryImpl[T]) DeleteByIds(ctx context.Context, ids []int64) error {
	return r.DeleteBatch(ctx, ids)
}

// FindAll 查询所有
func (r *BaseRepositoryImpl[T]) FindAll(ctx context.Context) ([]*T, error) {
	var entities []*T
	err := r.db.WithContext(ctx).Find(&entities).Error
	return entities, err
}

// FindOne 查询单个（带排序）
func (r *BaseRepositoryImpl[T]) FindOne(ctx context.Context, orderBy string, ascending bool) (*T, error) {
	var entity T
	query := r.db.WithContext(ctx).Model(new(T))
	if orderBy != "" {
		dir := "ASC"
		if !ascending {
			dir = "DESC"
		}
		query = query.Order(orderBy + " " + dir)
	}
	err := query.First(&entity).Error
	if err != nil {
		return nil, err
	}
	return &entity, nil
}

// Page 分页查询
func (r *BaseRepositoryImpl[T]) Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*T, int64, error) {
	if example == nil {
		example = &model.Example{}
	}

	// 设置分页
	example.Offset = (page - 1) * pageSize
	example.Limit = pageSize

	// 查询列表
	list, err := r.List(ctx, example)
	if err != nil {
		return nil, 0, err
	}

	// 统计总数（不带分页）
	countExample := &model.Example{
		Where:   example.Where,
		Or:      example.Or,
		OrderBy: nil, // count 时不需要排序
	}
	total, err := r.Count(ctx, countExample)
	if err != nil {
		return nil, 0, err
	}

	return list, total, nil
}

// String 格式化输出（调试用）
func (r *BaseRepositoryImpl[T]) String() string {
	return fmt.Sprintf("BaseRepositoryImpl<%T>", *new(T))
}
