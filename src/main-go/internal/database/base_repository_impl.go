package database

import (
	"context"
	"reflect"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"library-squirrel/pkg/model"
)

// baseRepository 泛型基础仓储实现
type baseRepository[T model.BaseEntity] struct {
	db *gorm.DB
}

// NewBaseRepository 创建泛型仓储实例
func NewBaseRepository[T model.BaseEntity](db *gorm.DB) BaseRepository[T] {
	return &baseRepository[T]{db: db}
}

// Save 保存单个实体
func (r *baseRepository[T]) Save(ctx context.Context, entity *T) error {
	return r.db.WithContext(ctx).Create(entity).Error
}

// SaveBatch 批量保存
func (r *baseRepository[T]) SaveBatch(ctx context.Context, entities []*T) error {
	if len(entities) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).CreateInBatches(entities, 100).Error
}

// Delete 根据ID删除
func (r *baseRepository[T]) Delete(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Delete(r.newEmptyModel(), id).Error
}

// DeleteBatch 批量删除
func (r *baseRepository[T]) DeleteBatch(ctx context.Context, ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Delete(r.newEmptyModel(), ids).Error
}

// Update 更新实体
func (r *baseRepository[T]) Update(ctx context.Context, entity *T) error {
	return r.db.WithContext(ctx).Save(entity).Error
}

// UpdateBatch 批量更新
func (r *baseRepository[T]) UpdateBatch(ctx context.Context, entities []*T) error {
	if len(entities) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Save(entities).Error
}

// GetById 根据ID获取
func (r *baseRepository[T]) GetById(ctx context.Context, id int64) (*T, error) {
	var entity T
	if err := r.db.WithContext(ctx).First(&entity, id).Error; err != nil {
		return nil, err
	}
	return &entity, nil
}

// Get 获取单个（支持Example条件查询）
func (r *baseRepository[T]) Get(ctx context.Context, example *model.Example) (*T, error) {
	var entity T
	query := r.buildQuery(example)
	if err := query.First(&entity).Error; err != nil {
		return nil, err
	}
	return &entity, nil
}

// List 获取列表（支持Example条件查询）
func (r *baseRepository[T]) List(ctx context.Context, example *model.Example) ([]*T, error) {
	var entities []*T
	query := r.buildQuery(example)
	if err := query.Find(&entities).Error; err != nil {
		return nil, err
	}
	return entities, nil
}

// Count 统计数量
func (r *baseRepository[T]) Count(ctx context.Context, example *model.Example) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(r.newEmptyModel())
	r.applyConditions(query, example)
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// buildQuery 构建查询
func (r *baseRepository[T]) buildQuery(example *model.Example) *gorm.DB {
	query := r.db.WithContext(context.Background()).Model(r.newEmptyModel())
	r.applyConditions(query, example)

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

// applyConditions 应用查询条件
func (r *baseRepository[T]) applyConditions(query *gorm.DB, example *model.Example) {
	// AND 条件 - 使用 GORM Where
	for _, cond := range example.Where {
		query = r.applyCondition(query, cond)
	}

	// OR 条件 - 使用 GORM Or
	if len(example.Or) > 0 {
		for i, cond := range example.Or {
			if i == 0 {
				query = r.applyCondition(query, cond)
			} else {
				query = query.Or(r.buildClause(cond))
			}
		}
	}
}

// applyCondition 应用单个条件
func (r *baseRepository[T]) applyCondition(query *gorm.DB, cond model.Condition) *gorm.DB {
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
		return query.Where(cond.Field+" IN ?", r.toInterfaceSlice(cond.Value))
	case "IS_NULL":
		return query.Where(cond.Field + " IS NULL")
	case "IS_NOT_NULL":
		return query.Where(cond.Field + " IS NOT NULL")
	case "BETWEEN":
		return query.Where(cond.Field+" BETWEEN ? AND ?", r.toInterfaceSlice(cond.Value)...)
	}
	return query
}

// buildClause 将 Condition 转换为 GORM clause.Expression（用于 Or）
func (r *baseRepository[T]) buildClause(cond model.Condition) clause.Expression {
	switch cond.Op {
	case "=":
		return clause.Eq{Column: cond.Field, Value: cond.Value}
	case "!=":
		return clause.Neq{Column: cond.Field, Value: cond.Value}
	case ">":
		return clause.Gt{Column: cond.Field, Value: cond.Value}
	case ">=":
		return clause.Gte{Column: cond.Field, Value: cond.Value}
	case "<":
		return clause.Lt{Column: cond.Field, Value: cond.Value}
	case "<=":
		return clause.Lte{Column: cond.Field, Value: cond.Value}
	case "LIKE":
		return clause.Like{Column: cond.Field, Value: cond.Value}
	case "IN":
		return clause.IN{Column: cond.Field, Values: r.toInterfaceSlice(cond.Value)}
	case "IS_NULL":
		return clause.Expr{SQL: cond.Field + " IS NULL"}
	case "IS_NOT_NULL":
		return clause.Expr{SQL: cond.Field + " IS NOT NULL"}
	case "BETWEEN":
		// BETWEEN 使用 Expr 实现
		vals := r.toInterfaceSlice(cond.Value)
		if len(vals) == 2 {
			return clause.Expr{SQL: cond.Field + " BETWEEN ? AND ?", Vars: vals}
		}
		return clause.Expr{SQL: "1=1"}
	}
	return clause.Expr{SQL: "1=1"}
}

// toInterfaceSlice 将任意类型的 slice 转换为 []interface{}
func (r *baseRepository[T]) toInterfaceSlice(v interface{}) []interface{} {
	if v == nil {
		return nil
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() != reflect.Slice {
		return nil
	}
	result := make([]interface{}, rv.Len())
	for i := 0; i < rv.Len(); i++ {
		result[i] = rv.Index(i).Interface()
	}
	return result
}

// newEmptyModel 创建空实例用于获取类型信息
func (r *baseRepository[T]) newEmptyModel() T {
	var t T
	return t
}
