# 🔗 CertyChain AI — Blockchain Certificate Verification System

> **Appskep Indonesia** · Enterprise-grade digital certificate verification powered by Blockchain + AI

[![Go](https://img.shields.io/badge/Go-1.21-00ADD8?logo=go&logoColor=white)](https://go.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8-363636?logo=solidity)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📋 Fitur Utama

| Fitur | Status |
|---|---|
| Upload gambar sertifikat → SHA-256 hash | ✅ |
| Verifikasi vs registry blockchain | ✅ |
| AI Detection (Naive Bayes + CNN/MLP + Visual) | ✅ |
| Riwayat verifikasi per user | ✅ |
| Admin: Issue sertifikat + upload file | ✅ |
| Admin: User management (suspend/delete) | ✅ |
| Anchoring di Ethereum (Hardhat/Ganache) | ✅ |
| Dataset Appskep Indonesia  | ✅ |

---

## 🏗️ Arsitektur

```
┌──────────────────────────────────────────────────────────┐
│                     CertyChain AI                         │
├──────────┬──────────────┬───────────────┬────────────────┤
│  React   │  Go (Gin)    │  Python       │  Ethereum      │
│  Vite    │  + GORM      │  FastAPI      │  Hardhat       │
│  Port    │  + JWT       │  + AI Model   │  Solidity      │
│  5173    │  Port 8080   │  Port 8001    │  Port 8545     │
└──────────┴──────────────┴───────────────┴────────────────┘
                          │
                     MySQL 3306
```

---

## 🚀 Quick Start

### Prerequisites

- Go 1.21+
- Node.js 20+
- Python 3.11+
- MySQL 8.0+
- Node.js (for Hardhat blockchain)

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/web_certif.git
cd web_certif
```

### 2. Setup Environment

```bash
cp .env.example server/.env
# Edit server/.env sesuai konfigurasi lokal
```

### 3. Database

```bash
# Buat database MySQL
mysql -u root -p
CREATE DATABASE certychain_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'certychain'@'localhost' IDENTIFIED BY 'certychain_pass';
GRANT ALL PRIVILEGES ON certychain_db.* TO 'certychain'@'localhost';
```

### 4. Blockchain (Hardhat)

```bash
cd blockchain
npm install
npx hardhat node        # terminal 1 - biarkan jalan
npx hardhat run scripts/deploy.js --network localhost  # terminal 2
```

### 5. AI Service

```bash
cd ai_service
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001
# Model akan otomatis dilatih dari dataset pada startup pertama
```

### 6. Backend (Go)

```bash
cd server
# Edit .env dengan DB_DSN, CONTRACT_ADDRESS dari step 4
go mod tidy
go run .
```

### 7. Frontend

```bash
cd client
npm install
npm run dev
```

Buka: **http://localhost:5173**

---

## 🔐 Default Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@certychain.id` | `admin123` |
| User | `testuser@example.com` | `test123` |

---

## 🤖 AI Detection

Model dilatih menggunakan **57 gambar sertifikat resmi Appskep Indonesia**:

- **NaiveBayes** (40%) — Complement Naive Bayes pada TF-IDF trigram
- **CNN/MLP** (60%) — Multi-layer Perceptron (256→128→64)
- **Visual Classifier** — Ekstraksi 13 fitur visual (warna, layout, edge density)

Model tersimpan sebagai `.pkl` files dan dimuat otomatis saat startup.

---

## 📡 API Endpoints

```
GET  /api/health                     — System status
POST /api/auth/login                 — Login
POST /api/auth/register              — Register

POST /api/user/verify                — Verify by number/content
POST /api/user/verify/upload         — Verify by file upload (image/txt)
GET  /api/user/verifications         — History verifikasi user

GET  /api/admin/stats                — Dashboard statistics
POST /api/admin/certificates         — Issue certificate (manual)
POST /api/admin/certificates/upload  — Issue from file
GET  /api/admin/certificates         — List all certificates
GET  /api/admin/users                — List users
PUT  /api/admin/users/:id            — Update/suspend user
DELETE /api/admin/users/:id          — Delete user
GET  /api/admin/verifications        — All verifications

POST /predict              (AI) — Text-based prediction
POST /predict/image        (AI) — Image-based prediction
```

---

## 📁 Struktur Proyek

```
web_certif/
├── blockchain/       # Smart contract (Solidity + Hardhat)
├── server/           # Go backend (Gin + GORM)
│   ├── models/       # Database models
│   ├── blockchain/   # Ethereum client
│   ├── config/       # Configuration loader
│   └── main.go       # Routes & handlers
├── ai_service/       # Python AI service (FastAPI)
│   ├── model/        # ML models (pkl files generated at runtime)
│   └── main.py       # API endpoints
├── client/           # React frontend (Vite)
│   └── src/
│       ├── App.jsx           # Main application
│       └── components.jsx    # Reusable components
├── dataset/          # Appskep Indonesia certificate images (57 gambar)
├── docker-compose.yml
└── .env.example
```

---

## 🚢 Deployment

### GitHub → Railway (Recommended, Free)

1. Push ke GitHub
2. Buka [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Tambah services: MySQL, Go backend, Python AI, React (Nginx)
4. Set environment variables dari `.env.example`

### GitHub → Render (Alternative)

1. Push ke GitHub  
2. Buka [render.com](https://render.com) → New Web Service
3. Pilih repo → set build & start commands

---

## 🏢 Dibuat untuk Appskep Indonesia

Platform verifikasi sertifikat digital yang mengintegrasikan:
- **Blockchain** untuk integritas data yang tidak bisa dimanipulasi
- **AI** untuk deteksi pemalsuan visual dan tekstual
- **SHA-256** hash untuk fingerprint unik setiap sertifikat

---

*CertyChain AI © 2026 Appskep Indonesia. All rights reserved.*
