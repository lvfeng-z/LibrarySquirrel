package order

// OrderService 订单业务逻辑
type OrderService struct {
}

// NewOrderService 创建订单服务
func NewOrderService() *OrderService {
	return &OrderService{}
}

// CreateOrder 创建订单
func (s *OrderService) CreateOrder(userID int64, amount float64) int64 {
	// 业务逻辑
	return 1
}