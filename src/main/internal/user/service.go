package user

// UserService 用户业务逻辑
type UserService struct {
	repo *UserRepository
}

// NewUserService 创建用户服务
func NewUserService() *UserService {
	return &UserService{
		repo: NewUserRepository(),
	}
}

// Login 用户登录
func (s *UserService) Login(username, password string) bool {
	// 业务逻辑
	return s.repo.FindByUsername(username) == password
}