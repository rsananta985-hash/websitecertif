package config

import (
	"bufio"
	"os"
	"strings"
)

// Config holds all application configuration
type Config struct {
	DBDSN         string
	BlockchainRPC string
	ContractAddr  string
	PrivateKey    string
	AIServiceURL  string
	ServerPort    string
}

// Load reads .env file then environment variables (env vars take precedence)
func Load() *Config {
	loadEnvFile(".env")
	return &Config{
		DBDSN:         getEnv("DB_DSN", "root:@tcp(127.0.0.1:3306)/web_certif?charset=utf8mb4&parseTime=True&loc=Local"),
		BlockchainRPC: getEnv("BLOCKCHAIN_RPC_URL", "http://localhost:8545"),
		ContractAddr:  getEnv("CONTRACT_ADDRESS", "0x5FbDB2315678afecb367f032d93F642f64180aa3"),
		PrivateKey:    getEnv("PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"),
		AIServiceURL:  getEnv("AI_SERVICE_URL", "http://localhost:8001"),
		ServerPort:    getEnv("SERVER_PORT", "8080"),
	}
}

func loadEnvFile(filename string) {
	file, err := os.Open(filename)
	if err != nil {
		return
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			if _, exists := os.LookupEnv(key); !exists {
				os.Setenv(key, val)
			}
		}
	}
}

func getEnv(key, defaultVal string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return defaultVal
}
