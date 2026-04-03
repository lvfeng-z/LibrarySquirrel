package model

// SiteTag 站点标签
type SiteTag struct {
	ID            int64  `gorm:"primaryKey;column:id" json:"id"`
	SiteID        int64  `gorm:"column:site_id;uniqueIndex:idx_site_tag_site_site_tag" json:"siteId"`
	SiteTagID     string `gorm:"column:site_tag_id;uniqueIndex:idx_site_tag_site_site_tag" json:"siteTagId"`
	SiteTagName   string `gorm:"column:site_tag_name" json:"siteTagName"`
	BaseSiteTagID string `gorm:"column:base_site_tag_id" json:"baseSiteTagId"`
	Description   string `gorm:"column:description" json:"description"`
	LocalTagID    int64  `gorm:"column:local_tag_id" json:"localTagId"`
	LastUse       int64  `gorm:"column:last_use" json:"lastUse"`
	CreateTime    int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime    int64  `gorm:"column:update_time" json:"updateTime"`
}

func (SiteTag) TableName() string {
	return "site_tag"
}

func (e SiteTag) GetID() int64 {
	return e.ID
}

func (e SiteTag) GetCreateTime() int64 {
	return e.CreateTime
}

func (e SiteTag) GetUpdateTime() int64 {
	return e.UpdateTime
}

func (e SiteTag) SetCreateTime(time int64) {
	e.CreateTime = time
}

func (e SiteTag) SetUpdateTime(time int64) {
	e.UpdateTime = time
}
