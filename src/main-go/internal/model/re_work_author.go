package model

// ReWorkAuthor 作品与作者关联
type ReWorkAuthor struct {
	ID            int64 `gorm:"primaryKey;column:id" json:"id"`
	AuthorType    int   `gorm:"column:author_type" json:"authorType"`
	WorkID        int64 `gorm:"column:work_id" json:"workId"`
	LocalAuthorID int64 `gorm:"column:local_author_id" json:"localAuthorId"`
	SiteAuthorID  int64 `gorm:"column:site_author_id" json:"siteAuthorId"`
	AuthorRank    int   `gorm:"column:author_rank" json:"authorRank"`
	CreateTime    int64 `gorm:"column:create_time" json:"createTime"`
	UpdateTime    int64 `gorm:"column:update_time" json:"updateTime"`
}

func (ReWorkAuthor) TableName() string {
	return "re_work_author"
}

func (e ReWorkAuthor) GetID() int64 {
	return e.ID
}
