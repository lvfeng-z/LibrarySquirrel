package model

// Work 作品
type Work struct {
	ID                  int64  `gorm:"primaryKey;column:id" json:"id"`
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
	CreateTime          int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime          int64  `gorm:"column:update_time" json:"updateTime"`
}

func (Work) TableName() string {
	return "work"
}

func (e Work) GetID() int64 {
	return e.ID
}
