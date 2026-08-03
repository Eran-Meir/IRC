package main

import (
	"os"

	"github.com/Eran-Meir/IRC/services/ircd/internal/config"
	"github.com/Eran-Meir/IRC/services/ircd/internal/logger"
	"github.com/Eran-Meir/IRC/services/ircd/internal/metrics"
	"github.com/Eran-Meir/IRC/services/ircd/internal/server"
	"github.com/Eran-Meir/IRC/services/ircd/internal/state"
)

func main() {
	// 1. Load Configuration
	cfg := config.Load()

	// Initialize Custom Logger
	logger.Init(cfg.LogLevel)
	logger.Info("Starting Go IRCd...")

	// Start Prometheus Metrics & WebSocket Endpoint
	metrics.StartServer(metrics.DefaultMetricsPort, server.HandleWebSocket)

	// 2. Connect to Valkey (State Layer)
	err := state.InitValkey(cfg)
	if err != nil {
		logger.Error("Failed to connect to Valkey: %v", err)
		os.Exit(1)
	}
	logger.Info("Successfully connected to Valkey state backend.")

	// Start Valkey Cross-Pod Pub/Sub Listener
	state.StartPubSubListener(func(channelName string, payload string) {
		if ch := server.GetManager().GetOrCreateChannel(channelName); ch != nil {
			ch.Broadcast(nil, payload)
		}
	})

	// 3. Start TCP Server
	srv := server.NewServer(cfg.Port)
	logger.Info("Listening for IRC connections on port %s...", cfg.Port)
	if err := srv.Start(); err != nil {
		logger.Error("Server crashed: %v", err)
		os.Exit(1)
	}
}
