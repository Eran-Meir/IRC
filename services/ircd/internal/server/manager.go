package server

import (
	"strings"
	"sync"
)

// ServerManager maintains global registry of clients and channels
type ServerManager struct {
	channels map[string]*Channel
	clients  map[string]*Client // nick -> Client
	mu       sync.RWMutex
}

var (
	GlobalManager *ServerManager
	once          sync.Once
)

// GetManager returns singleton server manager
func GetManager() *ServerManager {
	once.Do(func() {
		GlobalManager = &ServerManager{
			channels: make(map[string]*Channel),
			clients:  make(map[string]*Client),
		}
	})
	return GlobalManager
}

// GetOrCreateChannel returns existing channel or creates a new one
func (m *ServerManager) GetOrCreateChannel(name string) *Channel {
	name = strings.ToLower(name)
	m.mu.Lock()
	defer m.mu.Unlock()

	ch, exists := m.channels[name]
	if !exists {
		ch = NewChannel(name)
		m.channels[name] = ch
	}
	return ch
}

// RemoveChannelIfEmpty removes channel if no users remain
func (m *ServerManager) RemoveChannelIfEmpty(name string) {
	name = strings.ToLower(name)
	m.mu.Lock()
	defer m.mu.Unlock()

	ch, exists := m.channels[name]
	if exists {
		ch.mu.RLock()
		isEmpty := len(ch.clients) == 0
		ch.mu.RUnlock()
		if isEmpty {
			delete(m.channels, name)
		}
	}
}

// RegisterNick associates a nickname with a client
func (m *ServerManager) RegisterNick(nick string, c *Client) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	lower := strings.ToLower(nick)
	if _, exists := m.clients[lower]; exists {
		return false // Nick in use
	}
	m.clients[lower] = c
	return true
}

// UnregisterNick removes a nickname
func (m *ServerManager) UnregisterNick(nick string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	lower := strings.ToLower(nick)
	delete(m.clients, lower)
}

// RemoveClient unregisters a client from global registry
func (m *ServerManager) RemoveClient(c *Client) {
	if c != nil && c.Nick != "" {
		m.UnregisterNick(c.Nick)
	}
}

// GetClientByNick finds a client by nickname
func (m *ServerManager) GetClientByNick(nick string) *Client {
	m.mu.RLock()
	defer m.mu.RUnlock()
	lower := strings.ToLower(nick)
	return m.clients[lower]
}
