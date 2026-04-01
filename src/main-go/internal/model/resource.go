package model

// Resource 资源
type Resource struct {
	ID                int64  `gorm:"primaryKey;column:id" json:"id"`
	WorkID            int64  `gorm:"column:work_id" json:"workId"`
	TaskID            int64  `gorm:"column:task_id" json:"taskId"`
	State             int    `gorm:"column:state" json:"state"`
	FilePath          string `gorm:"column:file_path" json:"filePath"`
	FileName          string `gorm:"column:file_name" json:"fileName"`
	FilenameExtension string `gorm:"column:filename_extension" json:"filenameExtension"`
	SuggestName       string `gorm:"column:suggest_name" json:"suggestName"`
	ResourceSize      int64  `gorm:"column:resource_size" json:"resourceSize"`
	Workdir           string `gorm:"column:workdir" json:"workdir"`
	ResourceComplete  int    `gorm:"column:resource_complete" json:"resourceComplete"`
	CreateTime        int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime        int64  `gorm:"column:update_time" json:"updateTime"`
}

func (Resource) TableName() string {
	return "resource"
}

func (e Resource) GetID() int64 {
	return e.ID
}
