package localAuthor

import (
	"context"

	"go.uber.org/zap"

	domain "library-squirrel/internal/model"
	"library-squirrel/internal/util"
	"library-squirrel/pkg/model"
)

var logger = zap.NewNop().Sugar()

// Service 本地作者服务
type Service struct {
	repo   Repository
	logger *zap.SugaredLogger
}

// NewService 创建本地作者服务
func NewService(repo Repository) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

// Save 保存作者
func (s *Service) Save(ctx context.Context, author *domain.LocalAuthor) error {
	return s.repo.Save(ctx, author)
}

// UpdateById 更新作者
func (s *Service) UpdateById(ctx context.Context, author *domain.LocalAuthor) error {
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
func (s *Service) GetById(ctx context.Context, id int64) (*domain.LocalAuthor, error) {
	return s.repo.GetById(ctx, id)
}

// List 查询列表
func (s *Service) List(ctx context.Context, example *model.Example) ([]*domain.LocalAuthor, error) {
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
func (s *Service) Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.LocalAuthor, int64, error) {
	return s.repo.Page(ctx, page, pageSize, example)
}

// ListReWorkAuthor 批量获取作品与作者的关联
func (s *Service) ListReWorkAuthor(ctx context.Context, workIds []int64) (map[int64][]*model.RankedLocalAuthor, error) {
	return s.repo.ListReWorkAuthor(ctx, workIds)
}

// ListByWorkId 查询作品的本地作者
func (s *Service) ListByWorkId(ctx context.Context, workId int64) ([]*model.RankedLocalAuthor, error) {
	return s.repo.ListByWorkId(ctx, workId)
}

// ListRankedLocalAuthorWithWorkIdByWorkIds 查询多个作品的本地作者列表
func (s *Service) ListRankedLocalAuthorWithWorkIdByWorkIds(ctx context.Context, workIds []int64) ([]*model.RankedLocalAuthorWithWorkId, error) {
	return s.repo.ListRankedLocalAuthorWithWorkIdByWorkIds(ctx, workIds)
}

// 错误定义
var (
	ErrAuthorIdRequired = &BusinessError{Code: 400, Message: "更新本地作者失败，id不能为空"}
)

// BusinessError 业务错误
type BusinessError struct {
	Code    int
	Message string
}

func (e *BusinessError) Error() string {
	return e.Message
}
