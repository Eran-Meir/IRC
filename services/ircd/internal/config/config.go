package config

import (
	"os"
)

// Default Configuration Constants
const (
	DefaultIRCPort   = "6667"
	DefaultValkeyURL = "localhost:6379"
	DefaultValkeyDB  = 0
	DefaultLogLevel  = "DEBUG"
)

// Config holds the runtime configuration for the IRCd
type Config struct {
	Port      string
	ValkeyURL string
	ValkeyDB  int
	LogLevel  string
}

// Load parses environment variables and returns a Config struct
func Load() *Config {
	port := os.Getenv("IRCD_PORT")
	if port == "" {
		port = DefaultIRCPort
	}

	valkeyURL := os.Getenv("VALKEY_URL")
	if valkeyURL == "" {
		valkeyURL = DefaultValkeyURL
	}

	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = DefaultLogLevel
	}

	return &Config{
		Port:      port,
		ValkeyURL: valkeyURL,
		ValkeyDB:  DefaultValkeyDB,
		LogLevel:  logLevel,
	}
}
