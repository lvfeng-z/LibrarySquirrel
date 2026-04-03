package localTag

import (
	"context"

	"go.uber.org/zap"

	domain "library-squirrel/internal/model"
	"library-squirrel/internal/util"
	"library-squirrel/pkg/model"
)

// 根标签ID
const RootLocalTagID = 0

var logger = zap.NewNop().Sugar()

// Service 本地标签服务
type Service struct {
	repo   Repository
	logger *zap.SugaredLogger
}

// NewService 创建本地标签服务
func NewService(repo Repository) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

// Save 保存本地标签
func (s *Service) Save(ctx context.Context, tag *domain.LocalTag) error {
	if tag.BaseLocalTagID == 0 {
		tag.BaseLocalTagID = 0 // 表示根标签
	}
	err := s.repo.Save(ctx, tag)
	if err != nil {
		return err
	}
	return nil
}

// UpdateById 更新本地标签
func (s *Service) UpdateById(ctx context.Context, tag *domain.LocalTag) error {
	if tag.ID == 0 {
		return ErrTagIdRequired
	}

	// 不能将自己设为上级标签
	if tag.BaseLocalTagID == tag.ID {
		return ErrCannotBeBaseOfSelf
	}

	if tag.BaseLocalTagID == 0 {
		tag.BaseLocalTagID = 0
	}

	// 查询新上级节点的所有上级节点，如果新上级是本节点的下级，则需要调整
	if tag.BaseLocalTagID != 0 {
		parentTags, err := s.repo.SelectParentNode(ctx, tag.BaseLocalTagID)
		if err != nil {
			return err
		}
		parentTagIds := make([]int64, len(parentTags))
		for i, pt := range parentTags {
			parentTagIds[i] = pt.ID
		}

		// 如果新的上级节点是原本的下级节点
		if contains(parentTagIds, tag.ID) {
			// 查询本节点原来的数据
			old, err := s.repo.GetById(ctx, tag.ID)
			if err != nil {
				return ErrOriginalTagNotFound
			}

			// 将新上级节点移动到本节点的原上级节点之下
			newBaseTag := &domain.LocalTag{}
			newBaseTag.ID = tag.BaseLocalTagID
			newBaseTag.BaseLocalTagID = old.BaseLocalTagID
			if err := s.repo.Update(ctx, newBaseTag); err != nil {
				return err
			}
		}
	}

	return s.repo.Update(ctx, tag)
}

// UpdateLastUse 更新最后使用时间
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
func (s *Service) GetById(ctx context.Context, id int64) (*domain.LocalTag, error) {
	return s.repo.GetById(ctx, id)
}

// List 查询列表
func (s *Service) List(ctx context.Context, example *model.Example) ([]*domain.LocalTag, error) {
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

// GetTree 获取标签树形结构
func (s *Service) GetTree(ctx context.Context, rootId int64, depth int) ([]*domain.LocalTag, error) {
	if rootId == 0 {
		rootId = RootLocalTagID // 默认根标签
	}
	if depth <= 0 {
		depth = 1
	}
	return s.repo.SelectTreeNode(ctx, rootId, depth)
}

// SelectParentNode 查询上级标签
func (s *Service) SelectParentNode(ctx context.Context, nodeId int64) ([]*domain.LocalTag, error) {
	return s.repo.SelectParentNode(ctx, nodeId)
}

// ListByWorkId 查询作品关联的标签
func (s *Service) ListByWorkId(ctx context.Context, workId int64) ([]*domain.LocalTag, error) {
	return s.repo.ListByWorkId(ctx, workId)
}

// 辅助函数
func contains(slice []int64, item int64) bool {
	for _, v := range slice {
		if v == item {
			return true
		}
	}
	return false
}

// 错误定义
var (
	ErrTagIdRequired       = &BusinessError{Code: 400, Message: "更新本地标签失败，id不能为空"}
	ErrCannotBeBaseOfSelf  = &BusinessError{Code: 400, Message: "基础标签不能为自身"}
	ErrOriginalTagNotFound = &BusinessError{Code: 404, Message: "修改本地标签失败，原标签信息不能为空"}
)

// BusinessError 业务错误
type BusinessError struct {
	Code    int
	Message string
}

func (e *BusinessError) Error() string {
	return e.Message
}
