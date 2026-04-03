package model

import "library-squirrel/pkg/model"

// SiteAuthor 站点作者
type SiteAuthor struct {
	model.BaseEntity
	SiteID               int64  `gorm:"column:site_id;uniqueIndex:idx_site_author_site_site_author" json:"siteId"`
	SiteAuthorID         string `gorm:"column:site_author_id;uniqueIndex:idx_site_author_site_site_author" json:"siteAuthorId"`
	AuthorName           string `gorm:"column:author_name" json:"authorName"`
	FixedAuthorName      string `gorm:"column:fixed_author_name" json:"fixedAuthorName"`
	SiteAuthorNameBefore string `gorm:"column:site_author_name_before" json:"siteAuthorNameBefore"`
	Introduce            string `gorm:"column:introduce" json:"introduce"`
	LocalAuthorID        int64  `gorm:"column:local_author_id" json:"localAuthorId"`
	LastUse              int64  `gorm:"column:last_use" json:"lastUse"`
}

func (SiteAuthor) TableName() string {
	return "site_author"
}
