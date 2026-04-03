package model

// LocalTag 本地标签
type LocalTag struct {
	ID             int64  `gorm:"primaryKey;column:id" json:"id"`
	LocalTagName   string `gorm:"column:local_tag_name" json:"localTagName"`
	BaseLocalTagID int64  `gorm:"column:base_local_tag_id" json:"baseLocalTagId"`
	LastUse        int64  `gorm:"column:last_use" json:"lastUse"`
	CreateTime     int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime     int64  `gorm:"column:update_time" json:"updateTime"`
}

// TableName 指定表名
func (LocalTag) TableName() string {
	return "local_tag"
}

// GetID 实现 BaseEntity 接口
func (t LocalTag) GetID() int64 {
	return t.ID
}

// GetCreateTime 实现 BaseEntity 接口
func (t LocalTag) GetCreateTime() int64 {
	return t.CreateTime
}

// GetUpdateTime 实现 BaseEntity 接口
func (t LocalTag) GetUpdateTime() int64 {
	return t.UpdateTime
}

// SetCreateTime 实现 BaseEntity 接口
func (t LocalTag) SetCreateTime(time int64) {
	t.CreateTime = time
}

// SetUpdateTime 实现 BaseEntity 接口
func (t LocalTag) SetUpdateTime(time int64) {
	t.UpdateTime = time
}
