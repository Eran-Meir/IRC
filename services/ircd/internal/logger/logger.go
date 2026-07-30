package logger

import (
	"fmt"
	"log"
	"os"
	"strings"
)

// ANSI Color Codes
const (
	Reset  = "\033[0m"
	Red    = "\033[31m"
	Green  = "\033[32m"
	Yellow = "\033[33m"
	Cyan   = "\033[36m"
)

type LogLevel int

const (
	LevelDebug LogLevel = iota
	LevelInfo
	LevelWarn
	LevelError
)

var currentLevel = LevelInfo

// Init configures the global logger level
func Init(level string) {
	switch strings.ToUpper(level) {
	case "DEBUG":
		currentLevel = LevelDebug
	case "INFO":
		currentLevel = LevelInfo
	case "WARN":
		currentLevel = LevelWarn
	case "ERROR":
		currentLevel = LevelError
	default:
		currentLevel = LevelInfo
	}

	// Remove default log flags since we are formatting our own
	log.SetFlags(0) 
	log.SetOutput(os.Stdout)
}

// Debug logs highly verbose actions (Cyan)
func Debug(format string, v ...interface{}) {
	if currentLevel <= LevelDebug {
		msg := fmt.Sprintf(format, v...)
		log.Printf("%s[DEBUG] %s%s\n", Cyan, msg, Reset)
	}
}

// Info logs successful or standard actions (Green)
func Info(format string, v ...interface{}) {
	if currentLevel <= LevelInfo {
		msg := fmt.Sprintf(format, v...)
		log.Printf("%s[INFO]  %s%s\n", Green, msg, Reset)
	}
}

// Warn logs non-critical issues (Yellow)
func Warn(format string, v ...interface{}) {
	if currentLevel <= LevelWarn {
		msg := fmt.Sprintf(format, v...)
		log.Printf("%s[WARN]  %s%s\n", Yellow, msg, Reset)
	}
}

// Error logs critical issues and problems (Red)
func Error(format string, v ...interface{}) {
	if currentLevel <= LevelError {
		msg := fmt.Sprintf(format, v...)
		log.Printf("%s[ERROR] %s%s\n", Red, msg, Reset)
	}
}
