package model

// Task 任务
type Task struct {
	ID                   int64  `gorm:"primaryKey;column:id" json:"id"`
	IsCollection         int    `gorm:"column:is_collection" json:"isCollection"`
	Pid                  int64  `gorm:"column:pid" json:"pid"`
	TaskName             string `gorm:"column:task_name" json:"taskName"`
	SiteID               int    `gorm:"column:site_id" json:"siteId"`
	SiteWorkID           string `gorm:"column:site_work_id" json:"siteWorkId"`
	URL                  string `gorm:"column:url" json:"url"`
	CreateTime           int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime           int64  `gorm:"column:update_time" json:"updateTime"`
	Status               int    `gorm:"column:status" json:"status"`
	PendingResourceID    int64  `gorm:"column:pending_resource_id" json:"pendingResourceId"`
	Continuable          int    `gorm:"column:continuable" json:"continuable"`
	PluginPublicID       string `gorm:"column:plugin_public_id" json:"pluginPublicId"`
	PluginContributionID string `gorm:"column:plugin_contribution_id" json:"pluginContributionId"`
	PluginData           string `gorm:"column:plugin_data" json:"pluginData"`
	ErrorMessage         string `gorm:"column:error_message" json:"errorMessage"`
}

func (Task) TableName() string {
	return "task"
}

func (e Task) GetID() int64 {
	return e.ID
}
