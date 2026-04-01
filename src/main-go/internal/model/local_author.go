package model

// LocalAuthor 本地作者
type LocalAuthor struct {
	ID         int64  `gorm:"primaryKey;column:id" json:"id"`
	AuthorName string `gorm:"column:author_name" json:"authorName"`
	Introduce  string `gorm:"column:introduce" json:"introduce"`
	LastUse    int64  `gorm:"column:last_use" json:"lastUse"`
	CreateTime int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime int64  `gorm:"column:update_time" json:"updateTime"`
}

func (LocalAuthor) TableName() string {
	return "local_author"
}

func (e LocalAuthor) GetID() int64 {
	return e.ID
}
