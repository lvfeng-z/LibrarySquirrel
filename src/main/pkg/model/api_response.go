package model

// ApiResponse 统一API响应格式
type ApiResponse struct {
	Code    int         `json:"code"`    // 业务状态码，0表示成功
	Message string      `json:"message"` // 消息
	Data    interface{} `json:"data"`    // 数据
}

// Success 成功响应
func Success(data interface{}) *ApiResponse {
	return &ApiResponse{
		Code:    0,
		Message: "success",
		Data:    data,
	}
}

// Error 错误响应
func Error(message string) *ApiResponse {
	return &ApiResponse{
		Code:    -1,
		Message: message,
		Data:    nil,
	}
}

// ErrorWithCode 带错误码的响应
func ErrorWithCode(code int, message string) *ApiResponse {
	return &ApiResponse{
		Code:    code,
		Message: message,
		Data:    nil,
	}
}
