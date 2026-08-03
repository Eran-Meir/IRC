package server

import (
	"fmt"
	"sync"
)

// Channel represents an active IRC chat room
type Channel struct {
	Name    string
	Topic   string
	clients map[*Client]bool
	mu      sync.RWMutex
}

// NewChannel creates a new channel instance
func NewChannel(name string) *Channel {
	return &Channel{
		Name:    name,
		Topic:   "Welcome to " + name,
		clients: make(map[*Client]bool),
	}
}

// AddClient adds a client to the channel
func (ch *Channel) AddClient(c *Client) {
	ch.mu.Lock()
	defer ch.mu.Unlock()
	ch.clients[c] = true
}

// RemoveClient removes a client from the channel
func (ch *Channel) RemoveClient(c *Client) bool {
	ch.mu.Lock()
	defer ch.mu.Unlock()
	delete(ch.clients, c)
	return len(ch.clients) == 0
}

// Broadcast sends an IRC line to all clients in the channel
func (ch *Channel) Broadcast(sender *Client, line string) {
	ch.mu.RLock()
	defer ch.mu.RUnlock()

	msg := []byte(line + "\r\n")
	for client := range ch.clients {
		// Send to everyone except the sender if sender is specified
		if sender != nil && client == sender {
			continue
		}
		client.SendRaw(msg)
	}
}

// GetNicks Returns space-separated list of nicknames in the channel
func (ch *Channel) GetNicks() string {
	ch.mu.RLock()
	defer ch.mu.RUnlock()

	nicks := ""
	for client := range ch.clients {
		if nicks != "" {
			nicks += " "
		}
		nicks += client.Nick
	}
	return nicks
}
