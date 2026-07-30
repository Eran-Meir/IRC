package main

import (
	"log"
	"os"

	"github.com/Eran-Meir/IRC/services/ircd/internal/config"
	"github.com/Eran-Meir/IRC/services/ircd/internal/server"
	"github.com/Eran-Meir/IRC/services/ircd/internal/state"
)

func main() {
	log.Println("Starting Go IRCd...")

	// 1. Load Configuration
	cfg := config.Load()

	// 2. Connect to Valkey (State Layer)
	err := state.InitValkey(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Valkey: %v", err)
	}
	log.Println("Successfully connected to Valkey state backend.")

	// 3. Start TCP Server
	srv := server.NewServer(cfg.Port)
	log.Printf("Listening for IRC connections on port %s...", cfg.Port)
	if err := srv.Start(); err != nil {
		log.Fatalf("Server crashed: %v", err)
	}
}
