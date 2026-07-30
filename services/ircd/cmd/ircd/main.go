package main

import (
	"log"
	"os"

	"github.com/Eran-Meir/IRC/services/ircd/internal/server"
	"github.com/Eran-Meir/IRC/services/ircd/internal/state"
)

func main() {
	log.Println("Starting Go IRCd...")

	// 1. Load Configuration
	port := os.Getenv("IRCD_PORT")
	if port == "" {
		port = "6667"
	}
	
	valkeyURL := os.Getenv("VALKEY_URL")
	if valkeyURL == "" {
		// Default for local testing if needed, though we run in K8s
		valkeyURL = "localhost:6379" 
	}

	// 2. Connect to Valkey (State Layer)
	err := state.InitValkey(valkeyURL)
	if err != nil {
		log.Fatalf("Failed to connect to Valkey: %v", err)
	}
	log.Println("Successfully connected to Valkey state backend.")

	// 3. Start TCP Server
	srv := server.NewServer(port)
	log.Printf("Listening for IRC connections on port %s...", port)
	if err := srv.Start(); err != nil {
		log.Fatalf("Server crashed: %v", err)
	}
}
