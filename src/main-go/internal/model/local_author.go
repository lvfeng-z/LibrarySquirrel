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

func (e LocalAuthor) GetCreateTime() int64 {
	return e.CreateTime
}

func (e LocalAuthor) GetUpdateTime() int64 {
	return e.UpdateTime
}

func (e LocalAuthor) SetCreateTime(time int64) {
	e.CreateTime = time
}

func (e LocalAuthor) SetUpdateTime(time int64) {
	e.UpdateTime = time
}
