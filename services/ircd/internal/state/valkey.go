package state

import (
	"context"
	"fmt"
	"strings"

	"github.com/Eran-Meir/IRC/services/ircd/internal/config"
	"github.com/Eran-Meir/IRC/services/ircd/internal/logger"
	"github.com/redis/go-redis/v9"
)

var Client *redis.Client
var Ctx = context.Background()

const ValkeyPubSubPrefix = "irc:channel:"

// InitValkey connects to the Valkey (Redis compatible) backend
func InitValkey(cfg *config.Config) error {
	Client = redis.NewClient(&redis.Options{
		Addr:     cfg.ValkeyURL,
		Password: "",
		DB:       cfg.ValkeyDB,
	})

	_, err := Client.Ping(Ctx).Result()
	if err != nil {
		return fmt.Errorf("failed to ping valkey: %w", err)
	}

	return nil
}

// PublishChannelMessage broadcasts a channel line across Valkey Pub/Sub
func PublishChannelMessage(channelName string, payload string) {
	if Client == nil {
		return
	}
	pubChannel := ValkeyPubSubPrefix + strings.ToLower(channelName)
	err := Client.Publish(Ctx, pubChannel, payload).Err()
	if err != nil {
		logger.Warn("Failed to publish message to Valkey [%s]: %v", pubChannel, err)
	}
}

// StartPubSubListener listens for cross-pod Valkey channel messages
func StartPubSubListener(onMsg func(channelName string, payload string)) {
	if Client == nil {
		return
	}

	go func() {
		pubsub := Client.PSubscribe(Ctx, ValkeyPubSubPrefix+"*")
		defer pubsub.Close()

		ch := pubsub.Channel()
		for msg := range ch {
			channelName := strings.TrimPrefix(msg.Channel, ValkeyPubSubPrefix)
			onMsg(channelName, msg.Payload)
		}
	}()
}
