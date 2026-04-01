package model

// ReWorkWorkSet 作品与作品集关联
type ReWorkWorkSet struct {
	ID         int64 `gorm:"primaryKey;column:id" json:"id"`
	WorkID     int64 `gorm:"column:work_id" json:"workId"`
	WorkSetID  int64 `gorm:"column:work_set_id" json:"workSetId"`
	IsCover    int   `gorm:"column:is_cover" json:"isCover"`
	SortOrder  int   `gorm:"column:sort_order" json:"sortOrder"`
	CreateTime int64 `gorm:"column:create_time" json:"createTime"`
	UpdateTime int64 `gorm:"column:update_time" json:"updateTime"`
}

func (ReWorkWorkSet) TableName() string {
	return "re_work_work_set"
}

func (e ReWorkWorkSet) GetID() int64 {
	return e.ID
}
