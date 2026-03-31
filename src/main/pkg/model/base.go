package model

// BaseEntity 所有领域实体必须实现此接口
type BaseEntity interface {
	GetID() int64
}

// ========== 分页模型 ==========

// PageRequest 分页请求
type PageRequest struct {
	Page     int `json:"page"`     // 页码，从1开始
	PageSize int `json:"pageSize"` // 每页数量
}

func (p *PageRequest) GetOffset() int {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.PageSize <= 0 {
		p.PageSize = 10
	}
	return (p.Page - 1) * p.PageSize
}

func (p *PageRequest) GetLimit() int {
	if p.PageSize <= 0 {
		return 10
	}
	return p.PageSize
}

// PageResponse 分页响应
type PageResponse[T any] struct {
	Items    []*T  `json:"items"`    // 数据列表
	Total    int64 `json:"total"`    // 总数量
	Page     int   `json:"page"`     // 当前页码
	PageSize int   `json:"pageSize"` // 每页数量
}

// NewPageResponse 创建分页响应
func NewPageResponse[T any](items []*T, total int64, page, pageSize int) *PageResponse[T] {
	return &PageResponse[T]{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}
}
