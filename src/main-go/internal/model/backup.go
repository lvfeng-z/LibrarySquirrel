package model

// Backup 备份
type Backup struct {
	ID         int64  `gorm:"primaryKey;column:id" json:"id"`
	SourceType int    `gorm:"column:source_type" json:"sourceType"`
	SourceID   int64  `gorm:"column:source_id" json:"sourceId"`
	FileName   string `gorm:"column:file_name" json:"fileName"`
	FilePath   string `gorm:"column:file_path" json:"filePath"`
	Workdir    string `gorm:"column:workdir" json:"workdir"`
	CreateTime int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime int64  `gorm:"column:update_time" json:"updateTime"`
}

func (Backup) TableName() string {
	return "backup"
}

func (e Backup) GetID() int64 {
	return e.ID
}
