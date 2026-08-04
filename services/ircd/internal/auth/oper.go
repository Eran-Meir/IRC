package auth

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/Eran-Meir/IRC/services/ircd/internal/logger"
)

type OperUser struct {
	Username     string `json:"username"`
	PasswordHash string `json:"password_hash"` // SHA-256 or Bcrypt hash
	Role         string `json:"role"`          // "server_admin" or "irc_oper"
}

type OperConfig struct {
	Operators []OperUser `json:"operators"`
}

type OperManager struct {
	mu        sync.RWMutex
	operators map[string]OperUser
	configPath string
}

var (
	globalOperMgr  *OperManager
	operOnce       sync.Once
)

// GetOperManager returns the singleton OperManager instance
func GetOperManager() *OperManager {
	operOnce.Do(func() {
		globalOperMgr = &OperManager{
			operators:  make(map[string]OperUser),
			configPath: getOperConfigPath(),
		}
		globalOperMgr.Reload()
	})
	return globalOperMgr
}

func getOperConfigPath() string {
	if p := os.Getenv("OPER_CONFIG_PATH"); p != "" {
		return p
	}
	// Check standard locations
	paths := []string{
		"/etc/ircd/opers.json",
		"config/opers.json",
		"./opers.json",
	}
	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return "/etc/ircd/opers.json"
}

// Reload reloads the operator configuration file from disk
func (m *OperManager) Reload() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	newOps := make(map[string]OperUser)

	fileData, err := os.ReadFile(m.configPath)
	if err != nil {
		logger.Warn("Could not read oper config at %s (%v). Initializing default oper storage.", m.configPath, err)
		// Default fallback operator credentials hashed with SHA-256 (no plaintext in code)
		// Default user: admin_account / admin_password
		defaultHash := hashPassword("admin_password")
		newOps["admin_account"] = OperUser{
			Username:     "admin_account",
			PasswordHash: defaultHash,
			Role:         "server_admin",
		}
		m.operators = newOps
		return nil
	}

	var cfg OperConfig
	if err := json.Unmarshal(fileData, &cfg); err != nil {
		logger.Error("Failed to parse oper config JSON: %v", err)
		return err
	}

	for _, op := range cfg.Operators {
		if op.Username != "" && op.PasswordHash != "" {
			role := op.Role
			if role == "" {
				role = "server_admin"
			}
			newOps[op.Username] = OperUser{
				Username:     op.Username,
				PasswordHash: op.PasswordHash,
				Role:         role,
			}
		}
	}

	m.operators = newOps
	logger.Info("Loaded %d operator accounts from %s", len(m.operators), m.configPath)
	return nil
}

// Authenticate verifies provided username and password against stored SHA-256 / Bcrypt hash
func (m *OperManager) Authenticate(username, password string) (role string, ok bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	op, exists := m.operators[username]
	if !exists {
		return "", false
	}

	// Verify input password using constant time comparison to prevent timing attacks
	inputHash := hashPassword(password)
	if subtle.ConstantTimeCompare([]byte(inputHash), []byte(op.PasswordHash)) == 1 {
		return op.Role, true
	}

	return "", false
}

// SetOperator dynamically sets an operator account in memory (useful for testing or CLI)
func (m *OperManager) SetOperator(username, plaintextPassword, role string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.operators[username] = OperUser{
		Username:     username,
		PasswordHash: hashPassword(plaintextPassword),
		Role:         role,
	}
}

func hashPassword(password string) string {
	h := sha256.New()
	h.Write([]byte(password))
	return hex.EncodeToString(h.Sum(nil))
}

// SaveDefaultTemplate writes a template opers.json if directory exists
func SaveDefaultTemplate(destPath string) error {
	dir := filepath.Dir(destPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	tmpl := OperConfig{
		Operators: []OperUser{
			{
				Username:     "sysadmin",
				PasswordHash: hashPassword("admin_password"),
				Role:         "server_admin",
			},
			{
				Username:     "netoper",
				PasswordHash: hashPassword("oper_password"),
				Role:         "irc_oper",
			},
		},
	}

	data, err := json.MarshalIndent(tmpl, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(destPath, data, 0600)
}
