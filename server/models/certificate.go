package models

import (
	"time"

	"gorm.io/gorm"
)

// ─── User ────────────────────────────────────────────────────────────────────
type User struct {
	ID        uint           `gorm:"primaryKey"               json:"id"`
	Name      string         `gorm:"not null"                 json:"name"`
	Email     string         `gorm:"uniqueIndex;not null"     json:"email"`
	Password       string         `gorm:"not null"                 json:"-"`
	Role           string         `gorm:"default:'user';not null"  json:"role"` // 'admin' | 'user'
	AllowedModules string         `gorm:"default:'dashboard,verify,history,profile';not null" json:"allowed_modules"`
	IsActive       bool           `gorm:"default:true;not null"    json:"is_active"`
	CreatedAt time.Time      `                                json:"created_at"`
	UpdatedAt time.Time      `                                json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"                    json:"-"`
}

// ─── Certificate (issued by Admin) ───────────────────────────────────────────
type Certificate struct {
	ID                uint           `gorm:"primaryKey"                json:"id"`
	CertificateNumber string         `gorm:"uniqueIndex;not null"      json:"certificate_number"`
	RecipientName     string         `gorm:"not null"                  json:"recipient_name"`
	RecipientEmail    string         `gorm:"index"                     json:"recipient_email"`
	Title             string         `gorm:"not null"                  json:"title"`
	Institution       string         `gorm:"not null"                  json:"institution"`
	IssueDate         time.Time      `                                 json:"issue_date"`
	Content           string         `gorm:"type:text"                 json:"content"`
	Hash              string         `gorm:"uniqueIndex;type:char(66)" json:"hash"`
	BlockchainAnchor  bool           `gorm:"default:false"             json:"blockchain_anchor"`
	TxHash            string         `                                 json:"tx_hash"`
	IssuedByID        uint           `gorm:"index"                     json:"issued_by_id"`
	IssuedBy          *User          `gorm:"foreignKey:IssuedByID"     json:"issued_by,omitempty"`
	CreatedAt         time.Time      `                                 json:"created_at"`
	UpdatedAt         time.Time      `                                 json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index"                     json:"-"`
}

// ─── Verification (submitted by User) ────────────────────────────────────────
type Verification struct {
	ID              uint         `gorm:"primaryKey"               json:"id"`
	UserID          uint         `gorm:"index;not null"           json:"user_id"`
	User            *User        `gorm:"foreignKey:UserID"        json:"user,omitempty"`
	UploadedHash    string       `gorm:"type:char(66)"            json:"uploaded_hash"`
	FileName        string       `gorm:"type:varchar(255)"        json:"file_name"`
	CertificateID   *uint        `gorm:"index"                    json:"certificate_id"`
	Certificate     *Certificate `gorm:"foreignKey:CertificateID" json:"certificate,omitempty"`
	IsGenuine       bool         `                                json:"is_genuine"`
	AIScore         float64      `                                json:"ai_score"`
	NaiveBayesScore float64      `                                json:"naive_bayes_score"`
	CNNScore        float64      `                                json:"cnn_score"`
	AIDetail        string       `gorm:"type:text"                json:"ai_detail"`
	ResultDetail    string       `gorm:"type:text"                json:"result_detail"`
	VerifiedAt      time.Time    `                                json:"verified_at"`
}

// ─── AutoMigrate ─────────────────────────────────────────────────────────────
func SetupDB(db *gorm.DB) error {
	return db.AutoMigrate(
		&User{},
		&Certificate{},
		&Verification{},
	)
}
