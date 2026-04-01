package model

// Plugin 插件
type Plugin struct {
	ID             int64  `gorm:"primaryKey;column:id" json:"id"`
	PublicID       string `gorm:"column:public_id;uniqueIndex" json:"publicId"`
	Author         string `gorm:"column:author" json:"author"`
	Name           string `gorm:"column:name" json:"name"`
	Version        string `gorm:"column:version" json:"version"`
	EntryPath      string `gorm:"column:entry_path" json:"entryPath"`
	RootPath       string `gorm:"column:root_path" json:"rootPath"`
	BackupID       int64  `gorm:"column:backup_id" json:"backupId"`
	CreateTime     int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime     int64  `gorm:"column:update_time" json:"updateTime"`
	SortNum        int    `gorm:"column:sort_num" json:"sortNum"`
	PluginData     string `gorm:"column:plugin_data" json:"pluginData"`
	Uninstalled    int    `gorm:"column:uninstalled" json:"uninstalled"`
	ActivationType string `gorm:"column:activation_type" json:"activationType"`
}

func (Plugin) TableName() string {
	return "plugin"
}

func (e Plugin) GetID() int64 {
	return e.ID
}
