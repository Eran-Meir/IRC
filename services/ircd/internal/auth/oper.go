package auth

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/Eran-Meir/IRC/services/ircd/internal/logger"
)

type OperUser struct {
	Username     string `json:"username,omitempty"`
	UsernameHash string `json:"username_hash,omitempty"`
	PasswordHash string `json:"password_hash"`
	Role         string `json:"role"` // "server_admin" or "irc_oper"
}

type OperConfig struct {
	Operators []OperUser `json:"operators"`
}

type OperManager struct {
	mu         sync.RWMutex
	operators  []OperUser
	configPath string
}

var (
	globalOperMgr *OperManager
	operOnce      sync.Once
)

// GetOperManager returns the singleton OperManager instance
func GetOperManager() *OperManager {
	operOnce.Do(func() {
		globalOperMgr = &OperManager{
			operators:  []OperUser{},
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

func getDefaultOperators() []OperUser {
	return []OperUser{
		// Smiley / SmileyAdminPassword123!@# (server_admin)
		{
			UsernameHash: "f424040f5afd8846f2948293acf1f499a502d081f49937bb4cf252d146a3d19e",
			PasswordHash: "270519fb86b723a39f740ed72b8eb7e5ef86d7daa5dc59e639a15f46ab11c3b5",
			Role:         "server_admin",
		},
		// ServerOperator / ServerOperatorPassword123!@# (irc_oper)
		{
			UsernameHash: "42a276745d59463e029d4f5ba056db16aabb89f3bd22c863e1efbcd32418804c",
			PasswordHash: "052ab2a46d23696ba88620a8bdd00577d539d5871dc964ead5110bf2badf789d",
			Role:         "irc_oper",
		},
		// testadmin / testadmin (server_admin)
		{
			UsernameHash: "597f5441e7d174b607873874ed54b974674986ad543e7458e28a038671c9f64c",
			PasswordHash: "597f5441e7d174b607873874ed54b974674986ad543e7458e28a038671c9f64c",
			Role:         "server_admin",
		},
		// testoper / testoper (irc_oper)
		{
			UsernameHash: "3a538ae006e86d77f3c2b9c267f7d211cb2700b24fe82c7023adbd36b48ca1fe",
			PasswordHash: "3a538ae006e86d77f3c2b9c267f7d211cb2700b24fe82c7023adbd36b48ca1fe",
			Role:         "irc_oper",
		},
		// admin_account / admin_password (legacy test fallback)
		{
			UsernameHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
			PasswordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
			Role:         "server_admin",
		},
	}
}

// Reload reloads the operator configuration file from disk
func (m *OperManager) Reload() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	fileData, err := os.ReadFile(m.configPath)
	if err != nil {
		logger.Warn("Could not read oper config at %s (%v). Using default encrypted oper accounts.", m.configPath, err)
		m.operators = getDefaultOperators()
		return nil
	}

	var cfg OperConfig
	if err := json.Unmarshal(fileData, &cfg); err != nil {
		logger.Error("Failed to parse oper config JSON: %v", err)
		m.operators = getDefaultOperators()
		return err
	}

	var loaded []OperUser
	for _, op := range cfg.Operators {
		if (op.Username != "" || op.UsernameHash != "") && op.PasswordHash != "" {
			role := op.Role
			if role == "" {
				role = "server_admin"
			}
			loaded = append(loaded, OperUser{
				Username:     op.Username,
				UsernameHash: op.UsernameHash,
				PasswordHash: op.PasswordHash,
				Role:         role,
			})
		}
	}

	if len(loaded) == 0 {
		m.operators = getDefaultOperators()
	} else {
		m.operators = loaded
	}

	logger.Info("Loaded %d encrypted operator accounts from %s", len(m.operators), m.configPath)
	return nil
}

// Authenticate verifies provided username and password against stored encrypted hashes
func (m *OperManager) Authenticate(username, password string) (role string, ok bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	inputUserHash := hashString(strings.ToLower(username))
	inputPassHash := hashString(password)

	for _, op := range m.operators {
		userMatches := false
		if op.UsernameHash != "" {
			if subtle.ConstantTimeCompare([]byte(inputUserHash), []byte(op.UsernameHash)) == 1 {
				userMatches = true
			}
		} else if op.Username != "" {
			if strings.EqualFold(username, op.Username) {
				userMatches = true
			}
		}

		if userMatches {
			if subtle.ConstantTimeCompare([]byte(inputPassHash), []byte(op.PasswordHash)) == 1 {
				return op.Role, true
			}
		}
	}

	return "", false
}

// SetOperator dynamically sets an operator account in memory (useful for testing or CLI)
func (m *OperManager) SetOperator(username, plaintextPassword, role string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.operators = append(m.operators, OperUser{
		UsernameHash: hashString(strings.ToLower(username)),
		PasswordHash: hashString(plaintextPassword),
		Role:         role,
	})
}

func hashString(data string) string {
	h := sha256.New()
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

// SaveDefaultTemplate writes a template opers.json if directory exists
func SaveDefaultTemplate(destPath string) error {
	dir := filepath.Dir(destPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	tmpl := OperConfig{
		Operators: getDefaultOperators(),
	}

	data, err := json.MarshalIndent(tmpl, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(destPath, data, 0600)
}
