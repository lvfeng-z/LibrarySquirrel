package model

import "library-squirrel/pkg/model"

// LocalAuthor 本地作者
type LocalAuthor struct {
	model.BaseEntity
	AuthorName string `gorm:"column:author_name" json:"authorName"`
	Introduce  string `gorm:"column:introduce" json:"introduce"`
	LastUse    int64  `gorm:"column:last_use" json:"lastUse"`
}

func (LocalAuthor) TableName() string {
	return "local_author"
}
