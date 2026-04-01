package model

// WorkSet 作品集
type WorkSet struct {
	ID                     int64  `gorm:"primaryKey;column:id" json:"id"`
	SiteID                 int64  `gorm:"column:site_id;uniqueIndex:idx_work_set_site_site_set" json:"siteId"`
	SiteWorkSetID          string `gorm:"column:site_work_set_id;uniqueIndex:idx_work_set_site_site_set" json:"siteWorkSetId"`
	SiteWorkSetName        string `gorm:"column:site_work_set_name" json:"siteWorkSetName"`
	SiteAuthorID           string `gorm:"column:site_author_id" json:"siteAuthorId"`
	SiteWorkSetDescription string `gorm:"column:site_work_set_description" json:"siteWorkSetDescription"`
	SiteUploadTime         int64  `gorm:"column:site_upload_time" json:"siteUploadTime"`
	SiteUpdateTime         int64  `gorm:"column:site_update_time" json:"siteUpdateTime"`
	NickName               string `gorm:"column:nick_name" json:"nickName"`
	LastView               int64  `gorm:"column:last_view" json:"lastView"`
	CreateTime             int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime             int64  `gorm:"column:update_time" json:"updateTime"`
}

func (WorkSet) TableName() string {
	return "work_set"
}

func (e WorkSet) GetID() int64 {
	return e.ID
}
