package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/user/web_certif/server/blockchain"
	"github.com/user/web_certif/server/config"
	"github.com/user/web_certif/server/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ─── Globals ──────────────────────────────────────────────────────────────────
var (
	db           *gorm.DB
	bc           *blockchain.Client
	jwtSecret    []byte
	bcAvailable  bool
	aiServiceURL string
)

// ─── AI Service Request/Response ──────────────────────────────────────────────
type aiRequest struct {
	Text string `json:"text"`
}

type aiResponse struct {
	Status          string  `json:"status"`
	Confidence      float64 `json:"confidence"`
	NaiveBayesScore float64 `json:"naive_bayes_score"`
	CNNScore        float64 `json:"cnn_score"`
	Detail          string  `json:"detail"`
}

// callAIService calls the Python FastAPI AI service.
// Falls back to random dummy scores if the service is unavailable.
func callAIService(text string) (nbScore, cnnScore, aiScore float64, genuine bool, isDummy bool) {
	if aiServiceURL == "" {
		goto dummy
	}
	{
		body, err := json.Marshal(aiRequest{Text: text})
		if err != nil {
			goto dummy
		}
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Post(aiServiceURL+"/predict", "application/json", bytes.NewReader(body))
		if err != nil {
			log.Printf("⚠ AI service unreachable: %v", err)
			goto dummy
		}
		defer resp.Body.Close()
		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			goto dummy
		}
		var aiResp aiResponse
		if err := json.Unmarshal(respBody, &aiResp); err != nil {
			goto dummy
		}
		nbScore = aiResp.NaiveBayesScore
		cnnScore = aiResp.CNNScore
		aiScore = aiResp.Confidence
		genuine = aiResp.Status == "Genuine"
		isDummy = false
		return
	}
dummy:
	// Fallback: dummy scores
	nbScore = 0.50 + rand.Float64()*0.40
	cnnScore = 0.50 + rand.Float64()*0.40
	aiScore = nbScore*0.4 + cnnScore*0.6
	genuine = aiScore >= 0.5
	isDummy = true
	return
}

// ─── JWT Claims ───────────────────────────────────────────────────────────────
type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	Name   string `json:"name"`
	jwt.RegisteredClaims
}

func main() {
	cfg := config.Load()

	// JWT secret
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "certychain-enterprise-secret-2024"
	}
	jwtSecret = []byte(secret)

	// ── Database ──────────────────────────────────────────────────────────────
	var err error
	gormCfg := &gorm.Config{Logger: logger.Default.LogMode(logger.Warn)}
	db, err = gorm.Open(mysql.Open(cfg.DBDSN), gormCfg)
	if err != nil {
		log.Fatalf("DB connection failed: %v", err)
	}
	if err := models.SetupDB(db); err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}
	log.Println("✓ Database connected and migrated")
	seedAdmin()

	// ── AI Service ────────────────────────────────────────────────────────────
	aiServiceURL = cfg.AIServiceURL
	aiClient := &http.Client{Timeout: 3 * time.Second}
	if resp, err := aiClient.Get(aiServiceURL + "/health"); err == nil && resp.StatusCode == 200 {
		log.Printf("✓ AI service connected at %s", aiServiceURL)
		resp.Body.Close()
	} else {
		log.Printf("⚠ AI service unavailable at %s (will use dummy scores)", aiServiceURL)
	}

	// ── Blockchain (Hardhat/Ganache) ──────────────────────────────────────────
	bc, err = blockchain.NewClient(cfg.BlockchainRPC, cfg.PrivateKey, cfg.ContractAddr)
	if err != nil {
		log.Printf("⚠ Blockchain unavailable: %v", err)
		bcAvailable = false
	} else {
		bcAvailable = true
		log.Println("✓ Blockchain connected")
	}

	// ── Router ────────────────────────────────────────────────────────────────
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	// CORS — read from env (supports production deployment)
	allowedOrigins := os.Getenv("CORS_ORIGIN")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:5173,http://localhost:3000,http://localhost:80"
	}
	originList := strings.Split(allowedOrigins, ",")
	r.Use(cors.New(cors.Config{
		AllowOrigins:     originList,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Requested-With"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	api := r.Group("/api")

	// Public
	api.GET("/health", healthHandler)
	api.GET("/verify/:hash", publicVerifyHandler)

	// Auth
	auth := api.Group("/auth")
	auth.POST("/register", registerHandler)
	auth.POST("/login", loginHandler)
	auth.GET("/me", authMiddleware(), meHandler)

	// Admin routes
	admin := api.Group("/admin")
	admin.Use(authMiddleware(), requireRole("admin"))
	admin.GET("/stats", adminStatsHandler)
	admin.POST("/certificates", adminIssueCertHandler)
	admin.POST("/certificates/upload", adminIssueCertUploadHandler)
	admin.GET("/certificates", adminListCertsHandler)
	admin.GET("/certificates/:id", adminGetCertHandler)
	admin.GET("/certificates/:id/download", adminDownloadCertHandler)
	admin.GET("/users", adminListUsersHandler)
	admin.GET("/users/:id", adminGetUserHandler)
	admin.PUT("/users/:id", adminUpdateUserHandler)
	admin.DELETE("/users/:id", adminDeleteUserHandler)
	admin.GET("/verifications", adminListVerificationsHandler)

	// User routes
	user := api.Group("/user")
	user.Use(authMiddleware(), requireRole("user"))
	user.POST("/verify", userVerifyHandler)
	user.POST("/verify/upload", userVerifyUploadHandler)
	user.GET("/verifications", userHistoryHandler)
	user.GET("/profile", userProfileHandler)

	// Public verify (no login needed)
	api.GET("/public/verify", publicVerifyByNumberHandler)

	port := cfg.ServerPort
	log.Printf("✓ CertyChain API running on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server start failed: %v", err)
	}
}

// ─── Seed Admin ───────────────────────────────────────────────────────────────
func seedAdmin() {
	var count int64
	db.Model(&models.User{}).Where("role = ?", "admin").Count(&count)
	if count > 0 {
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	admin := models.User{
		Name:     "Administrator",
		Email:    "admin@certychain.id",
		Password: string(hash),
		Role:     "admin",
	}
	if err := db.Create(&admin).Error; err != nil {
		log.Printf("Admin seed failed: %v", err)
	} else {
		log.Println("✓ Default admin created: admin@certychain.id / admin123")
	}
}

// ─── Middleware ───────────────────────────────────────────────────────────────
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("user_name", claims.Name)
		c.Next()
	}
}

func requireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("user_role") != role {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied: insufficient privileges"})
			return
		}
		c.Next()
	}
}

func makeToken(user *models.User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		Name:   user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
}

// ─── Health ───────────────────────────────────────────────────────────────────
func healthHandler(c *gin.Context) {
	sqlDB, _ := db.DB()
	dbOK := sqlDB.Ping() == nil

	// Check AI service
	aiOK := false
	aiStatus := "offline"
	if aiServiceURL != "" {
		aiClient := &http.Client{Timeout: 2 * time.Second}
		if resp, err := aiClient.Get(aiServiceURL + "/health"); err == nil {
			aiOK = resp.StatusCode == 200
			resp.Body.Close()
		}
	}
	if aiOK {
		aiStatus = "online"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":     "ok",
		"database":   map[bool]string{true: "connected", false: "error"}[dbOK],
		"blockchain": bcAvailable,
		"ai_service": aiStatus,
		"timestamp":  time.Now().Unix(),
	})
}

// ─── Auth: Register ───────────────────────────────────────────────────────────
func registerHandler(c *gin.Context) {
	var input struct {
		Name     string `json:"name"     binding:"required"`
		Email    string `json:"email"    binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check duplicate
	var existing models.User
	if db.Where("email = ?", input.Email).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	user := models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: string(hash),
		Role:     "user", // always user
	}
	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	token, err := makeToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token generation failed"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"message": "Account created successfully",
		"token":   token,
		"user":    gin.H{"id": user.ID, "name": user.Name, "email": user.Email, "role": user.Role},
	})
}

// ─── Auth: Login ──────────────────────────────────────────────────────────────
func loginHandler(c *gin.Context) {
	var input struct {
		Email    string `json:"email"    binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := db.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email or password is incorrect"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email or password is incorrect"})
		return
	}

	token, err := makeToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token generation failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
		"user":    gin.H{"id": user.ID, "name": user.Name, "email": user.Email, "role": user.Role},
	})
}

// ─── Auth: Me ─────────────────────────────────────────────────────────────────
func meHandler(c *gin.Context) {
	uid := c.GetUint("user_id")
	var user models.User
	if err := db.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": gin.H{"id": user.ID, "name": user.Name, "email": user.Email, "role": user.Role, "created_at": user.CreatedAt}})
}

// ─── Public: Verify by Hash ───────────────────────────────────────────────────
func publicVerifyHandler(c *gin.Context) {
	hash := c.Param("hash")
	var cert models.Certificate
	if err := db.Where("hash = ?", hash).First(&cert).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"genuine": false, "message": "Certificate not found in registry"})
		return
	}
	bcResult := map[string]interface{}{"available": false}
	if bcAvailable {
		if res, err := bc.VerifyCertificate(hash); err == nil {
			bcResult = map[string]interface{}{"available": true, "exists": res.Exists, "issuer": res.Issuer, "timestamp": res.Timestamp}
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"genuine":     true,
		"certificate": cert,
		"blockchain":  bcResult,
	})
}

// ─── Admin: Stats ─────────────────────────────────────────────────────────────
func adminStatsHandler(c *gin.Context) {
	var totalCerts, anchored, totalUsers, totalVerifications, genuineVerif int64
	db.Model(&models.Certificate{}).Count(&totalCerts)
	db.Model(&models.Certificate{}).Where("blockchain_anchor = ?", true).Count(&anchored)
	db.Model(&models.User{}).Where("role = ?", "user").Count(&totalUsers)
	db.Model(&models.Verification{}).Count(&totalVerifications)
	db.Model(&models.Verification{}).Where("is_genuine = ?", true).Count(&genuineVerif)

	// Recent 7 days issued
	var weekCerts int64
	db.Model(&models.Certificate{}).Where("created_at >= ?", time.Now().AddDate(0, 0, -7)).Count(&weekCerts)

	c.JSON(http.StatusOK, gin.H{
		"total_certificates":    totalCerts,
		"blockchain_anchored":   anchored,
		"total_users":           totalUsers,
		"total_verifications":   totalVerifications,
		"genuine_verifications": genuineVerif,
		"certs_this_week":       weekCerts,
	})
}

// ─── Admin: Issue Certificate ─────────────────────────────────────────────────
func adminIssueCertHandler(c *gin.Context) {
	var input struct {
		CertificateNumber string `json:"certificate_number" binding:"required"`
		RecipientName     string `json:"recipient_name"     binding:"required"`
		RecipientEmail    string `json:"recipient_email"`
		Title             string `json:"title"              binding:"required"`
		Institution       string `json:"institution"        binding:"required"`
		IssueDate         string `json:"issue_date"         binding:"required"` // "2024-01-15"
		Content           string `json:"content"            binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check duplicate cert number
	var existing models.Certificate
	if db.Where("certificate_number = ?", input.CertificateNumber).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Certificate number already exists"})
		return
	}

	// Parse issue date
	issueDate, err := time.Parse("2006-01-02", input.IssueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid issue_date format, use YYYY-MM-DD"})
		return
	}

	// SHA-256 hash of content
	hashBytes := sha256.Sum256([]byte(input.Content))
	hashHex := fmt.Sprintf("0x%x", hashBytes)

	adminID := c.GetUint("user_id")
	cert := models.Certificate{
		CertificateNumber: input.CertificateNumber,
		RecipientName:     input.RecipientName,
		RecipientEmail:    input.RecipientEmail,
		Title:             input.Title,
		Institution:       input.Institution,
		IssueDate:         issueDate,
		Content:           input.Content,
		Hash:              hashHex,
		IssuedByID:        adminID,
	}

	if err := db.Create(&cert).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save certificate"})
		return
	}

	// Anchor to Ganache blockchain
	txHash := ""
	anchored := false
	if bcAvailable {
		if tx, err := bc.IssueCertificate(hashHex); err == nil {
			txHash = tx
			anchored = true
			db.Model(&cert).Updates(map[string]interface{}{
				"blockchain_anchor": true,
				"tx_hash":           txHash,
			})
		} else {
			log.Printf("Blockchain anchor failed: %v", err)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":             "Certificate issued successfully",
		"certificate":         cert,
		"blockchain_anchored": anchored,
		"tx_hash":             txHash,
	})
}

// ─── Admin: List Certificates ─────────────────────────────────────────────────
func adminListCertsHandler(c *gin.Context) {
	var certs []models.Certificate
	q := db.Order("created_at DESC")

	// Optional search query
	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		q = q.Where("recipient_name LIKE ? OR recipient_email LIKE ? OR certificate_number LIKE ? OR institution LIKE ?",
			like, like, like, like)
	}
	// Optional pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset := (page - 1) * limit

	var total int64
	q.Model(&models.Certificate{}).Count(&total)
	q.Limit(limit).Offset(offset).Find(&certs)

	c.JSON(http.StatusOK, gin.H{"certificates": certs, "total": total, "page": page})
}

// ─── Admin: Get Certificate Detail ───────────────────────────────────────────
func adminGetCertHandler(c *gin.Context) {
	var cert models.Certificate
	if err := db.Preload("IssuedBy").First(&cert, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Certificate not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"certificate": cert})
}

// ─── Admin: List Users ────────────────────────────────────────────────────────
func adminListUsersHandler(c *gin.Context) {
	var users []models.User
	search := c.Query("search")
	q := db.Where("role = ?", "user").Order("created_at DESC")
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("name LIKE ? OR email LIKE ?", like, like)
	}
	q.Find(&users)
	type SafeUser struct {
		ID        uint      `json:"id"`
		Name      string    `json:"name"`
		Email     string    `json:"email"`
		Role      string    `json:"role"`
		IsActive  bool      `json:"is_active"`
		CreatedAt time.Time `json:"created_at"`
	}
	safe := make([]SafeUser, len(users))
	for i, u := range users {
		safe[i] = SafeUser{ID: u.ID, Name: u.Name, Email: u.Email, Role: u.Role, IsActive: u.IsActive, CreatedAt: u.CreatedAt}
	}
	c.JSON(http.StatusOK, gin.H{"users": safe, "total": len(safe)})
}

// ─── Admin: All Verifications ─────────────────────────────────────────────────
func adminListVerificationsHandler(c *gin.Context) {
	var verifs []models.Verification
	db.Preload("User").Preload("Certificate").Order("verified_at DESC").Limit(100).Find(&verifs)
	c.JSON(http.StatusOK, gin.H{"verifications": verifs, "total": len(verifs)})
}

// ─── User: Verify Certificate ─────────────────────────────────────────────────
func userVerifyHandler(c *gin.Context) {
	var input struct {
		// User can verify by content OR by certificate number
		Content           string `json:"content"`
		CertificateNumber string `json:"certificate_number"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Content == "" && input.CertificateNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Provide either 'content' or 'certificate_number'"})
		return
	}

	userID := c.GetUint("user_id")

	var cert models.Certificate
	found := false

	if input.CertificateNumber != "" {
		// Search by number
		if db.Where("certificate_number = ?", input.CertificateNumber).First(&cert).Error == nil {
			found = true
		}
	} else {
		// Hash the content and search
		hashBytes := sha256.Sum256([]byte(input.Content))
		uploadedHash := fmt.Sprintf("0x%x", hashBytes)
		if db.Where("hash = ?", uploadedHash).First(&cert).Error == nil {
			found = true
		}
	}

	// Compute hash for storage
	contentForHash := input.Content
	if contentForHash == "" {
		contentForHash = input.CertificateNumber
	}
	hashBytes := sha256.Sum256([]byte(contentForHash))
	uploadedHash := fmt.Sprintf("0x%x", hashBytes)

	// ── AI Analysis ──────────────────────────────────────────────────────────
	// Use the certificate content (if found) or the input for AI analysis
	aiText := input.Content
	if aiText == "" && found {
		aiText = cert.Content // use stored content if verifying by number
	}
	if aiText == "" {
		aiText = contentForHash // fallback
	}
	nbScore, cnnScore, aiScore, _, isDummy := callAIService(aiText)
	_ = isDummy // used for logging only

	// ── Save verification record ──────────────────────────────────────────────
	resultDetail := fmt.Sprintf(
		`{"method":"hash_matching","blockchain_check":%v,"ai_used":%v,"nb_score":%.4f,"cnn_score":%.4f}`,
		bcAvailable, !isDummy, nbScore, cnnScore,
	)
	verif := models.Verification{
		UserID:          userID,
		UploadedHash:    uploadedHash,
		IsGenuine:       found,
		AIScore:         aiScore,
		NaiveBayesScore: nbScore,
		CNNScore:        cnnScore,
		ResultDetail:    resultDetail,
		VerifiedAt:      time.Now(),
	}
	if found {
		verif.CertificateID = &cert.ID
	}
	db.Create(&verif)

	// Build response
	resp := gin.H{
		"is_genuine":        found,
		"ai_score":          aiScore,
		"naive_bayes_score": nbScore,
		"cnn_score":         cnnScore,
		"verification_id":   verif.ID,
		"verified_at":       verif.VerifiedAt,
	}
	if found {
		resp["certificate"] = cert
		resp["message"] = "Certificate is GENUINE — found in the official registry."
	} else {
		resp["certificate"] = nil
		resp["message"] = "Certificate NOT FOUND — not registered in the official registry."
	}

	// Check blockchain if anchored
	if found && bcAvailable && cert.Hash != "" {
		if res, err := bc.VerifyCertificate(cert.Hash); err == nil {
			resp["blockchain_verified"] = res.Exists
			resp["blockchain_issuer"]   = res.Issuer
		}
	}

	c.JSON(http.StatusOK, resp)
}

// ─── User: My History ────────────────────────────────────────────────────────
func userHistoryHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	var verifs []models.Verification
	db.Where("user_id = ?", userID).
		Preload("Certificate").
		Order("verified_at DESC").
		Find(&verifs)
	c.JSON(http.StatusOK, gin.H{"verifications": verifs, "total": len(verifs)})
}

// ─── User: Profile ────────────────────────────────────────────────────────────
func userProfileHandler(c *gin.Context) {
	userID := c.GetUint("user_id")
	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	var totalVerifs, genuineCount int64
	db.Model(&models.Verification{}).Where("user_id = ?", userID).Count(&totalVerifs)
	db.Model(&models.Verification{}).Where("user_id = ? AND is_genuine = ?", userID, true).Count(&genuineCount)
	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id": user.ID, "name": user.Name, "email": user.Email,
			"role": user.Role, "created_at": user.CreatedAt,
		},
		"stats": gin.H{
			"total_verifications": totalVerifs,
			"genuine_found":       genuineCount,
			"fake_detected":       totalVerifs - genuineCount,
		},
	})
}
// ─── User: Verify by File Upload ──────────────────────────────────────────────
func userVerifyUploadHandler(c *gin.Context) {
	const maxSize = 10 << 20 // 10 MB
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded. Use field name 'file'"})
		return
	}

	// Validate file size
	if fileHeader.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large (max 10MB)"})
		return
	}

	// Read file content
	f, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}
	defer f.Close()

	fileBytes, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file content"})
		return
	}

	// Determine content string for AI (treat as UTF-8 text, fallback to filename)
	contentStr := strings.TrimSpace(string(fileBytes))
	if !isValidUTF8Text(contentStr) || len(contentStr) < 10 {
		// Binary file (PDF/image): use filename as AI text hint
		contentStr = "certificate file: " + fileHeader.Filename
	}

	// SHA-256 of raw bytes — for binary files
	// SHA-256 of trimmed text — for text files (matches how admin issued)
	var hashHex string
	if isValidUTF8Text(strings.TrimSpace(string(fileBytes))) && len(strings.TrimSpace(string(fileBytes))) >= 10 {
		// Text file: hash the trimmed content (same as admin issue flow)
		hashBytes := sha256.Sum256([]byte(strings.TrimSpace(string(fileBytes))))
		hashHex = fmt.Sprintf("0x%x", hashBytes)
	} else {
		// Binary: hash raw bytes
		hashBytes := sha256.Sum256(fileBytes)
		hashHex = fmt.Sprintf("0x%x", hashBytes)
	}

	userID := c.GetUint("user_id")

	// Search DB by hash
	var cert models.Certificate
	found := db.Where("hash = ?", hashHex).First(&cert).Error == nil

	var nbScore, cnnScore, aiScore float64
	var isDummy bool
	
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext == ".jpg" || ext == ".jpeg" || ext == ".png" {
		// Image analysis
		var status string
		nbScore, cnnScore, aiScore, status, _ = callAIImage(fileBytes, fileHeader.Filename)
		isDummy = false
		if status == "Unknown" {
			isDummy = true
		}
	} else {
		// Text analysis
		nbScore, cnnScore, aiScore, _, isDummy = callAIService(contentStr)
	}

	// Save verification record
	resultDetail := fmt.Sprintf(
		`{"method":"file_upload","filename":%q,"size":%d,"blockchain_check":%v,"ai_used":%v}`,
		fileHeader.Filename, fileHeader.Size, bcAvailable, !isDummy,
	)
	verif := models.Verification{
		UserID:          userID,
		UploadedHash:    hashHex,
		FileName:        fileHeader.Filename,
		IsGenuine:       found,
		AIScore:         aiScore,
		NaiveBayesScore: nbScore,
		CNNScore:        cnnScore,
		ResultDetail:    resultDetail,
		VerifiedAt:      time.Now(),
	}
	if found {
		verif.CertificateID = &cert.ID
	}
	db.Create(&verif)

	// Build response
	resp := gin.H{
		"is_genuine":        found,
		"ai_score":          aiScore,
		"naive_bayes_score": nbScore,
		"cnn_score":         cnnScore,
		"verification_id":   verif.ID,
		"verified_at":       verif.VerifiedAt,
		"filename":          fileHeader.Filename,
		"file_size":         fileHeader.Size,
		"hash":              hashHex,
	}
	if found {
		resp["certificate"] = cert
		resp["message"] = "Certificate is GENUINE — found in the official registry."
	} else {
		resp["certificate"] = nil
		resp["message"] = "Certificate NOT FOUND — not registered in the official registry."
	}

	// Blockchain check
	if found && bcAvailable && cert.Hash != "" {
		if res, err := bc.VerifyCertificate(cert.Hash); err == nil {
			resp["blockchain_verified"] = res.Exists
			resp["blockchain_issuer"] = res.Issuer
		}
	}

	c.JSON(http.StatusOK, resp)
}

// isValidUTF8Text returns true if s is valid UTF-8 text with mostly printable chars
func isValidUTF8Text(s string) bool {
	if len(s) == 0 {
		return false
	}
	printable := 0
	for _, r := range s {
		if r != 65533 && (r == '\n' || r == '\r' || r == '\t' || (r >= 32 && r < 127) || r > 159) {
			printable++
		}
	}
	return float64(printable)/float64(len([]rune(s))) > 0.85
}

// ─── Admin: Issue Certificate by File Upload ───────────────────────────────────
func adminIssueCertUploadHandler(c *gin.Context) {
	// Parse multipart form fields
	certNumber := strings.TrimSpace(c.PostForm("certificate_number"))
	recipientName := strings.TrimSpace(c.PostForm("recipient_name"))
	recipientEmail := strings.TrimSpace(c.PostForm("recipient_email"))
	title := strings.TrimSpace(c.PostForm("title"))
	institution := strings.TrimSpace(c.PostForm("institution"))
	issueDateStr := strings.TrimSpace(c.PostForm("issue_date"))

	if certNumber == "" || recipientName == "" || title == "" || institution == "" || issueDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Fields certificate_number, recipient_name, title, institution, issue_date are required"})
		return
	}

	// Parse issue date
	issueDate, err := time.Parse("2006-01-02", issueDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid issue_date format, use YYYY-MM-DD"})
		return
	}

	// Read uploaded file
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required (field name: 'file')"})
		return
	}
	f, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cannot open file"})
		return
	}
	defer f.Close()
	fileBytes, _ := io.ReadAll(f)

	contentToStore := ""
	var hashBytes [32]byte
	if isValidUTF8Text(strings.TrimSpace(string(fileBytes))) && len(strings.TrimSpace(string(fileBytes))) >= 10 {
		contentToStore = strings.TrimSpace(string(fileBytes))
		hashBytes = sha256.Sum256([]byte(contentToStore))
	} else {
		contentToStore = "[BINARY CERTIFICATE DATA]"
		hashBytes = sha256.Sum256(fileBytes)
	}
	hashHex := fmt.Sprintf("0x%x", hashBytes)

	// Check duplicate
	var existing models.Certificate
	if db.Where("certificate_number = ?", certNumber).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Certificate number already exists"})
		return
	}

	adminID := c.GetUint("user_id")
	cert := models.Certificate{
		CertificateNumber: certNumber,
		RecipientName:     recipientName,
		RecipientEmail:    recipientEmail,
		Title:             title,
		Institution:       institution,
		IssueDate:         issueDate,
		Content:           contentToStore,
		Hash:              hashHex,
		IssuedByID:        adminID,
	}
	if err := db.Create(&cert).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save certificate"})
		return
	}

	txHash := ""
	anchored := false
	if bcAvailable {
		if tx, e2 := bc.IssueCertificate(hashHex); e2 == nil {
			txHash = tx
			anchored = true
			db.Model(&cert).Updates(map[string]interface{}{"blockchain_anchor": true, "tx_hash": txHash})
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":             "Certificate issued successfully from file",
		"certificate":         cert,
		"blockchain_anchored": anchored,
		"tx_hash":             txHash,
		"source_file":         fileHeader.Filename,
	})
}

// ─── Admin: Download Certificate as .txt ──────────────────────────────────────
func adminDownloadCertHandler(c *gin.Context) {
	id := c.Param("id")
	var cert models.Certificate
	if db.First(&cert, id).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Certificate not found"})
		return
	}

	// Build the downloadable text file
	text := fmt.Sprintf(`Appskep Indonesia — CertyChain Certificate Registry
==============================================
Certificate Number : %s
Recipient Name     : %s
Recipient Email    : %s
Title              : %s
Institution        : %s
Issue Date         : %s

--- CERTIFICATE CONTENT ---
%s

--- INTEGRITY HASH ---
SHA-256  : %s
Tx Hash  : %s
Anchored : %v

==============================================
Diterbitkan oleh: Appskep Indonesia
Verified by CertyChain Blockchain Registry
URL: http://localhost:5173
Date generated: %s
`,
		cert.CertificateNumber,
		cert.RecipientName,
		cert.RecipientEmail,
		cert.Title,
		cert.Institution,
		cert.IssueDate.Format("02 January 2006"),
		cert.Content,
		cert.Hash,
		cert.TxHash,
		cert.BlockchainAnchor,
		time.Now().Format("02 Jan 2006 15:04:05"),
	)

	filename := fmt.Sprintf("certificate_%s.txt", cert.CertificateNumber)
	c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.String(http.StatusOK, text)
}

// ─── Public Verify (no login required) ────────────────────────────────────────
func publicVerifyByNumberHandler(c *gin.Context) {
	certNum := strings.TrimSpace(c.Query("cert"))
	hashQ := strings.TrimSpace(c.Query("hash"))

	if certNum == "" && hashQ == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Provide query parameter 'cert' (certificate number) or 'hash'"})
		return
	}

	var cert models.Certificate
	var found bool

	if certNum != "" {
		found = db.Where("certificate_number = ?", certNum).First(&cert).Error == nil
	} else {
		found = db.Where("hash = ?", hashQ).First(&cert).Error == nil
	}

	resp := gin.H{
		"is_genuine": found,
		"queried_at": time.Now(),
	}
	if found {
		resp["certificate"] = gin.H{
			"certificate_number": cert.CertificateNumber,
			"recipient_name":     cert.RecipientName,
			"title":              cert.Title,
			"institution":        cert.Institution,
			"issue_date":         cert.IssueDate,
			"blockchain_anchor":  cert.BlockchainAnchor,
			"hash":               cert.Hash,
		}
		resp["message"] = "Certificate FOUND — registered in the official registry."

		// Blockchain double-check
		if bcAvailable && cert.Hash != "" {
			if res, e := bc.VerifyCertificate(cert.Hash); e == nil {
				resp["blockchain_verified"] = res.Exists
				resp["blockchain_issuer"] = res.Issuer
				resp["blockchain_timestamp"] = res.Timestamp
			}
		}
	} else {
		resp["message"] = "Certificate NOT FOUND — not registered in the official registry."
	}

	c.JSON(http.StatusOK, resp)
}

// ─── Admin: Get User Detail + History ────────────────────────────────────────
func adminGetUserHandler(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	var verifs []models.Verification
	db.Where("user_id = ?", user.ID).Preload("Certificate").Order("verified_at DESC").Limit(20).Find(&verifs)
	var totalVerifs, genuineCount int64
	db.Model(&models.Verification{}).Where("user_id = ?", user.ID).Count(&totalVerifs)
	db.Model(&models.Verification{}).Where("user_id = ? AND is_genuine = ?", user.ID, true).Count(&genuineCount)
	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id": user.ID, "name": user.Name, "email": user.Email,
			"role": user.Role, "created_at": user.CreatedAt,
			"is_active": user.IsActive,
		},
		"stats": gin.H{
			"total_verifications": totalVerifs,
			"genuine_found":       genuineCount,
			"suspicious_detected": totalVerifs - genuineCount,
		},
		"recent_verifications": verifs,
	})
}

// ─── Admin: Update User (toggle active/change name) ───────────────────────────
func adminUpdateUserHandler(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	// Prevent modifying the admin account
	if user.Role == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify admin account"})
		return
	}
	var input struct {
		Name     string `json:"name"`
		IsActive *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}
	db.Model(&user).Updates(updates)
	c.JSON(http.StatusOK, gin.H{
		"message": "User updated successfully",
		"user":    gin.H{"id": user.ID, "name": user.Name, "email": user.Email, "role": user.Role, "is_active": user.IsActive},
	})
}

// ─── Admin: Delete User ───────────────────────────────────────────────────────
func adminDeleteUserHandler(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if user.Role == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete the admin account"})
		return
	}
	// Soft delete verifications first
	db.Where("user_id = ?", user.ID).Delete(&models.Verification{})
	if err := db.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully", "deleted_id": user.ID})
}

// ─── callAIImage: forward an image file to AI service ─────────────────────────
func callAIImage(fileBytes []byte, filename string) (nbScore float64, cnnScore float64, aiScore float64, status string, detail string) {
	if aiServiceURL == "" {
		return 0.5, 0.5, 0.5, "Unknown", "AI service not configured"
	}
	boundary := "certychainboundary12345"
	body := &bytes.Buffer{}
	body.WriteString("--" + boundary + "\r\n")
	mimeType := "image/jpeg"
	if strings.HasSuffix(strings.ToLower(filename), ".png") {
		mimeType = "image/png"
	}
	body.WriteString(fmt.Sprintf("Content-Disposition: form-data; name=\"file\"; filename=\"%s\"\r\n", filename))
	body.WriteString(fmt.Sprintf("Content-Type: %s\r\n\r\n", mimeType))
	body.Write(fileBytes)
	body.WriteString("\r\n--" + boundary + "--\r\n")

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("POST", aiServiceURL+"/predict/image", body)
	if err != nil {
		return 0.5, 0.5, 0.5, "Unknown", "Request creation failed"
	}
	req.Header.Set("Content-Type", "multipart/form-data; boundary="+boundary)

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("⚠ AI image service err: %v", err)
		return 0.5, 0.5, 0.5, "Unknown", "AI image service unreachable"
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		log.Printf("⚠ AI image service HTTP %d: %s", resp.StatusCode, string(respBody))
		return 0.5, 0.5, 0.5, "Unknown", "AI image service rejected request"
	}
	var aiResp aiResponse
	if err := json.Unmarshal(respBody, &aiResp); err != nil {
		return 0.5, 0.5, 0.5, "Unknown", "AI response parse error"
	}
	return aiResp.NaiveBayesScore, aiResp.CNNScore, aiResp.Confidence, aiResp.Status, aiResp.Detail
}
