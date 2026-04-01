package model

// SiteAuthor 站点作者
type SiteAuthor struct {
	ID                   int64  `gorm:"primaryKey;column:id" json:"id"`
	SiteID               int64  `gorm:"column:site_id;uniqueIndex:idx_site_author_site_site_author" json:"siteId"`
	SiteAuthorID         string `gorm:"column:site_author_id;uniqueIndex:idx_site_author_site_site_author" json:"siteAuthorId"`
	AuthorName           string `gorm:"column:author_name" json:"authorName"`
	FixedAuthorName      string `gorm:"column:fixed_author_name" json:"fixedAuthorName"`
	SiteAuthorNameBefore string `gorm:"column:site_author_name_before" json:"siteAuthorNameBefore"`
	Introduce            string `gorm:"column:introduce" json:"introduce"`
	LocalAuthorID        int64  `gorm:"column:local_author_id" json:"localAuthorId"`
	LastUse              int64  `gorm:"column:last_use" json:"lastUse"`
	CreateTime           int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime           int64  `gorm:"column:update_time" json:"updateTime"`
}

func (SiteAuthor) TableName() string {
	return "site_author"
}

func (e SiteAuthor) GetID() int64 {
	return e.ID
}
