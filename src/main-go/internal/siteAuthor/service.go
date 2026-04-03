package siteAuthor

import (
	"context"

	"go.uber.org/zap"

	domain "library-squirrel/internal/model"
	"library-squirrel/internal/util"
	"library-squirrel/pkg/model"
)

var logger = zap.NewNop().Sugar()

// Service 站点作者服务
type Service struct {
	repo   Repository
	logger *zap.SugaredLogger
}

// NewService 创建站点作者服务
func NewService(repo Repository) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

// Save 保存站点作者
func (s *Service) Save(ctx context.Context, author *domain.SiteAuthor) error {
	return s.repo.Save(ctx, author)
}

// SaveBatch 批量保存站点作者
func (s *Service) SaveBatch(ctx context.Context, authors []*domain.SiteAuthor) error {
	return s.repo.SaveBatch(ctx, authors)
}

// UpdateById 更新站点作者
func (s *Service) UpdateById(ctx context.Context, author *domain.SiteAuthor) error {
	if author.ID == 0 {
		return ErrAuthorIdRequired
	}
	return s.repo.Update(ctx, author)
}

// UpdateLastUse 批量更新最后使用时间
func (s *Service) UpdateLastUse(ctx context.Context, ids []int64) error {
	now := util.GetCurrentTimestamp()
	for _, id := range ids {
		author, err := s.repo.GetById(ctx, id)
		if err != nil {
			continue
		}
		author.LastUse = now
		if err := s.repo.Update(ctx, author); err != nil {
			return err
		}
	}
	return nil
}

// GetById 根据ID获取
func (s *Service) GetById(ctx context.Context, id int64) (*domain.SiteAuthor, error) {
	return s.repo.GetById(ctx, id)
}

// List 查询列表
func (s *Service) List(ctx context.Context, example *model.Example) ([]*domain.SiteAuthor, error) {
	return s.repo.List(ctx, example)
}

// Count 统计数量
func (s *Service) Count(ctx context.Context, example *model.Example) (int64, error) {
	return s.repo.Count(ctx, example)
}

// Delete 删除作者
func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

// Page 分页查询
func (s *Service) Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.SiteAuthor, int64, error) {
	return s.repo.Page(ctx, page, pageSize, example)
}

// ListByWorkId 查询作品的站点作者
func (s *Service) ListByWorkId(ctx context.Context, workId int64) ([]*model.RankedSiteAuthor, error) {
	return s.repo.ListByWorkId(ctx, workId)
}

// ListBySiteAuthorIds 根据站点作者ID列表查询
func (s *Service) ListBySiteAuthorIds(ctx context.Context, siteAuthorIds []int64) ([]*domain.SiteAuthor, error) {
	return s.repo.ListBySiteAuthorIds(ctx, siteAuthorIds)
}

// ListRankedSiteAuthorWithWorkIdByWorkIds 查询多个作品的站点作者列表
func (s *Service) ListRankedSiteAuthorWithWorkIdByWorkIds(ctx context.Context, workIds []int64) ([]*model.RankedSiteAuthorWithWorkId, error) {
	return s.repo.ListRankedSiteAuthorWithWorkIdByWorkIds(ctx, workIds)
}

// UpdateBindLocalAuthor 绑定本地作者
func (s *Service) UpdateBindLocalAuthor(ctx context.Context, localAuthorId int64, siteAuthorIds []int64) (bool, error) {
	if localAuthorId == 0 {
		logger.Error("站点作者绑定本地作者失败，localAuthorId不能为空")
		return false, nil
	}
	if len(siteAuthorIds) == 0 {
		return true, nil
	}
	affected, err := s.repo.UpdateBindLocalAuthor(ctx, localAuthorId, siteAuthorIds)
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}

// 错误定义
var (
	ErrAuthorIdRequired = &BusinessError{Code: 400, Message: "更新站点作者失败，id不能为空"}
)

// BusinessError 业务错误
type BusinessError struct {
	Code    int
	Message string
}

func (e *BusinessError) Error() string {
	return e.Message
}
