package state

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

var Client *redis.Client
var Ctx = context.Background()

// InitValkey connects to the Valkey (Redis compatible) backend
func InitValkey(url string) error {
	Client = redis.NewClient(&redis.Options{
		Addr:     url,
		Password: "", // No password for internal cluster comms initially
		DB:       0,
	})

	// Ping to verify connection
	_, err := Client.Ping(Ctx).Result()
	if err != nil {
		return fmt.Errorf("failed to ping valkey: %w", err)
	}

	return nil
}
