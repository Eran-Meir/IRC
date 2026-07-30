package state

import (
	"context"
	"fmt"

	"github.com/Eran-Meir/IRC/services/ircd/internal/config"
	"github.com/redis/go-redis/v9"
)

var Client *redis.Client
var Ctx = context.Background()

// InitValkey connects to the Valkey (Redis compatible) backend
func InitValkey(cfg *config.Config) error {
	Client = redis.NewClient(&redis.Options{
		Addr:     cfg.ValkeyURL,
		Password: "", // No password for internal cluster comms initially
		DB:       cfg.ValkeyDB,
	})

	// Ping to verify connection
	_, err := Client.Ping(Ctx).Result()
	if err != nil {
		return fmt.Errorf("failed to ping valkey: %w", err)
	}

	return nil
}
