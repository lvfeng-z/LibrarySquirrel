package model

import "library-squirrel/pkg/model"

// Work 作品
type Work struct {
	*model.BaseEntity
	SiteID              int64  `gorm:"column:site_id;uniqueIndex:idx_work_site_site_work" json:"siteId"`
	SiteWorkID          string `gorm:"column:site_work_id;uniqueIndex:idx_work_site_site_work" json:"siteWorkId"`
	SiteWorkName        string `gorm:"column:site_work_name" json:"siteWorkName"`
	SiteAuthorID        string `gorm:"column:site_author_id" json:"siteAuthorId"`
	SiteWorkDescription string `gorm:"column:site_work_description" json:"siteWorkDescription"`
	SiteUploadTime      int64  `gorm:"column:site_upload_time" json:"siteUploadTime"`
	SiteUpdateTime      int64  `gorm:"column:site_update_time" json:"siteUpdateTime"`
	NickName            string `gorm:"column:nick_name" json:"nickName"`
	LocalAuthorID       int64  `gorm:"column:local_author_id" json:"localAuthorId"`
	LastView            int64  `gorm:"column:last_view" json:"lastView"`
}

func NewWork() *Work {
	return &Work{
		BaseEntity: &model.BaseEntity{},
	}
}

func (Work) TableName() string {
	return "work"
}
