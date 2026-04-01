package model

// SecureStorage 安全存储
type SecureStorage struct {
	ID             int64  `gorm:"primaryKey;column:id" json:"id"`
	StorageKey     string `gorm:"column:storage_key;uniqueIndex" json:"storageKey"`
	EncryptedValue string `gorm:"column:encrypted_value" json:"encryptedValue"`
	Description    string `gorm:"column:description" json:"description"`
	CreateTime     int64  `gorm:"column:create_time" json:"createTime"`
	UpdateTime     int64  `gorm:"column:update_time" json:"updateTime"`
}

func (SecureStorage) TableName() string {
	return "secure_storage"
}

func (e SecureStorage) GetID() int64 {
	return e.ID
}
