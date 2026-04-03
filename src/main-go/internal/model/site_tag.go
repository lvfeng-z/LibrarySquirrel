package model

import "library-squirrel/pkg/model"

// SiteTag 站点标签
type SiteTag struct {
	model.BaseEntity
	SiteID        int64  `gorm:"column:site_id;uniqueIndex:idx_site_tag_site_site_tag" json:"siteId"`
	SiteTagID     string `gorm:"column:site_tag_id;uniqueIndex:idx_site_tag_site_site_tag" json:"siteTagId"`
	SiteTagName   string `gorm:"column:site_tag_name" json:"siteTagName"`
	BaseSiteTagID string `gorm:"column:base_site_tag_id" json:"baseSiteTagId"`
	Description   string `gorm:"column:description" json:"description"`
	LocalTagID    int64  `gorm:"column:local_tag_id" json:"localTagId"`
	LastUse       int64  `gorm:"column:last_use" json:"lastUse"`
}

func (SiteTag) TableName() string {
	return "site_tag"
}
