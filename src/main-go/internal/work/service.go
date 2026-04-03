package work

import (
	"context"

	"go.uber.org/zap"

	domain "library-squirrel/internal/model"
	"library-squirrel/internal/util"
	"library-squirrel/pkg/model"
)

var logger = zap.NewNop().Sugar()

// Service 作品服务
type Service struct {
	repo   Repository
	logger *zap.SugaredLogger
}

// NewService 创建作品服务
func NewService(repo Repository) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

// Save 保存作品
func (s *Service) Save(ctx context.Context, work *domain.Work) error {
	now := util.GetCurrentTimestamp()
	if work.ID == 0 {
		work.CreateTime = now
	}
	work.UpdateTime = now
	return s.repo.Save(ctx, work)
}

// UpdateById 更新作品
func (s *Service) UpdateById(ctx context.Context, work *domain.Work) error {
	if work.ID == 0 {
		return ErrWorkIdRequired
	}
	work.UpdateTime = util.GetCurrentTimestamp()
	return s.repo.Update(ctx, work)
}

// GetById 根据ID获取
func (s *Service) GetById(ctx context.Context, id int64) (*domain.Work, error) {
	return s.repo.GetById(ctx, id)
}

// List 查询列表
func (s *Service) List(ctx context.Context, example *model.Example) ([]*domain.Work, error) {
	return s.repo.List(ctx, example)
}

// Count 统计数量
func (s *Service) Count(ctx context.Context, example *model.Example) (int64, error) {
	return s.repo.Count(ctx, example)
}

// Delete 删除作品
func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

// Page 分页查询
func (s *Service) Page(ctx context.Context, page, pageSize int, example *model.Example) ([]*domain.Work, int64, error) {
	return s.repo.Page(ctx, page, pageSize, example)
}

// GetBySiteAndSiteWorkID 根据站点和站点作品ID查询
func (s *Service) GetBySiteAndSiteWorkID(ctx context.Context, siteId int64, siteWorkId string) (*domain.Work, error) {
	return s.repo.GetBySiteAndSiteWorkID(ctx, siteId, siteWorkId)
}

// 错误定义
var (
	ErrWorkIdRequired = &BusinessError{Code: 400, Message: "更新作品失败，id不能为空"}
)

// BusinessError 业务错误
type BusinessError struct {
	Code    int
	Message string
}

func (e *BusinessError) Error() string {
	return e.Message
}
