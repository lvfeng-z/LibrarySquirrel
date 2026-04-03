package siteTag

import (
	"context"

	"go.uber.org/zap"

	domain "library-squirrel/internal/model"
	"library-squirrel/internal/util"
	"library-squirrel/pkg/model"
)

var logger = zap.NewNop().Sugar()

// Service 站点标签服务
type Service struct {
	repo   Repository
	logger *zap.SugaredLogger
}

// NewService 创建站点标签服务
func NewService(repo Repository) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

// Save 保存站点标签
func (s *Service) Save(ctx context.Context, tag *domain.SiteTag) error {
	return s.repo.Save(ctx, tag)
}

// SaveBatch 批量保存站点标签
func (s *Service) SaveBatch(ctx context.Context, tags []*domain.SiteTag) error {
	return s.repo.SaveBatch(ctx, tags)
}

// UpdateById 更新站点标签
func (s *Service) UpdateById(ctx context.Context, tag *domain.SiteTag) error {
	if tag.ID == 0 {
		return ErrTagIdRequired
	}
	return s.repo.Update(ctx, tag)
}

// UpdateLastUse 批量更新最后使用时间
func (s *Service) UpdateLastUse(ctx context.Context, ids []int64) error {
	now := util.GetCurrentTimestamp()
	for _, id := range ids {
		tag, err := s.repo.GetById(ctx, id)
		if err != nil {
			continue
		}
		tag.LastUse = now
		if err := s.repo.Update(ctx, tag); err != nil {
			return err
		}
	}
	return nil
}

// GetById 根据ID获取
func (s *Service) GetById(ctx context.Context, id int64) (*domain.SiteTag, error) {
	return s.repo.GetById(ctx, id)
}

// List 查询列表
func (s *Service) List(ctx context.Context, example *model.Example) ([]*domain.SiteTag, error) {
	return s.repo.List(ctx, example)
}

// Count 统计数量
func (s *Service) Count(ctx context.Context, example *model.Example) (int64, error) {
	return s.repo.Count(ctx, example)
}

// Delete 删除标签
func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

// Page 分页查询
func (s *Service) Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.SiteTag, int64, error) {
	return s.repo.Page(ctx, page, pageSize, example)
}

// ListByWorkId 查询作品的站点标签
func (s *Service) ListByWorkId(ctx context.Context, workId int64) ([]*domain.SiteTag, error) {
	return s.repo.ListByWorkId(ctx, workId)
}

// ListBySiteTagIds 根据站点标签ID列表查询
func (s *Service) ListBySiteTagIds(ctx context.Context, siteTagIds []int64) ([]*domain.SiteTag, error) {
	return s.repo.ListBySiteTagIds(ctx, siteTagIds)
}

// UpdateBindLocalTag 绑定本地标签
func (s *Service) UpdateBindLocalTag(ctx context.Context, localTagId int64, siteTagIds []int64) (bool, error) {
	if localTagId == 0 {
		logger.Error("站点标签绑定本地标签失败，localTagId不能为空")
		return false, nil
	}
	if len(siteTagIds) == 0 {
		return true, nil
	}
	affected, err := s.repo.UpdateBindLocalTag(ctx, localTagId, siteTagIds)
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}

// 错误定义
var (
	ErrTagIdRequired = &BusinessError{Code: 400, Message: "更新站点标签失败，id不能为空"}
)

// BusinessError 业务错误
type BusinessError struct {
	Code    int
	Message string
}

func (e *BusinessError) Error() string {
	return e.Message
}
