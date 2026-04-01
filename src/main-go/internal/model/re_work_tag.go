package model

// ReWorkTag 作品与标签关联
type ReWorkTag struct {
	ID         int64 `gorm:"primaryKey;column:id" json:"id"`
	WorkID     int64 `gorm:"column:work_id" json:"workId"`
	TagType    int   `gorm:"column:tag_type" json:"tagType"`
	LocalTagID int64 `gorm:"column:local_tag_id;uniqueIndex:idx_re_work_tag_work_local_tag" json:"localTagId"`
	SiteTagID  int64 `gorm:"column:site_tag_id;uniqueIndex:idx_re_work_tag_work_site_tag" json:"siteTagId"`
	CreateTime int64 `gorm:"column:create_time" json:"createTime"`
	UpdateTime int64 `gorm:"column:update_time" json:"updateTime"`
}

func (ReWorkTag) TableName() string {
	return "re_work_tag"
}

func (e ReWorkTag) GetID() int64 {
	return e.ID
}
