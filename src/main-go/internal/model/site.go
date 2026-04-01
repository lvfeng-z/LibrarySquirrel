package model

// Site 站点
type Site struct {
	ID              int64  `gorm:"primaryKey;column:id" json:"id"`
	SiteName        string `gorm:"column:site_name" json:"siteName"`
	SiteDescription string `gorm:"column:site_description" json:"siteDescription"`
	Homepage        string `gorm:"column:homepage" json:"homepage"`
	CreateTime      int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime      int64  `gorm:"column:update_time" json:"updateTime"`
}

func (Site) TableName() string {
	return "site"
}

func (e Site) GetID() int64 {
	return e.ID
}
