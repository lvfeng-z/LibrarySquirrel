package model

import "library-squirrel/pkg/model"

// LocalTag 本地标签
type LocalTag struct {
	model.BaseEntity        // 嵌入基础实体
	LocalTagName     string `gorm:"column:local_tag_name" json:"localTagName"`
	BaseLocalTagID   int64  `gorm:"column:base_local_tag_id" json:"baseLocalTagId"`
	LastUse          int64  `gorm:"column:last_use" json:"lastUse"`
}

// TableName 指定表名
func (LocalTag) TableName() string {
	return "local_tag"
}
