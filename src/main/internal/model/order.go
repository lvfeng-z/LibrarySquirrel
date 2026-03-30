package model

// Order 订单数据结构
type Order struct {
	ID        int64   `json:"id"`
	UserID    int64   `json:"userId"`
	Amount    float64 `json:"amount"`
	Status    string  `json:"status"`
	CreatedAt int64   `json:"createdAt"`
}