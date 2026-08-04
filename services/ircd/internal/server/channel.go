package server

import (
	"strings"
	"sync"
)

// Channel represents an active IRC chat room with modes & operator privileges
type Channel struct {
	Name      string
	Topic     string
	Key       string
	Limit     int
	Modes     map[byte]bool
	protected map[*Client]bool
	ops       map[*Client]bool
	halfops   map[*Client]bool
	voiced    map[*Client]bool
	bans      map[string]bool
	invited   map[*Client]bool
	clients   map[*Client]bool
	mu        sync.RWMutex
}

// NewChannel creates a new channel instance with default +n +t modes
func NewChannel(name string) *Channel {
	return &Channel{
		Name:      name,
		Topic:     "Welcome to " + name,
		Modes:     map[byte]bool{'n': true, 't': true},
		protected: make(map[*Client]bool),
		ops:       make(map[*Client]bool),
		halfops:   make(map[*Client]bool),
		voiced:    make(map[*Client]bool),
		bans:      make(map[string]bool),
		invited:   make(map[*Client]bool),
		clients:   make(map[*Client]bool),
	}
}

// AddClient adds a client to the channel. First client automatically gains Operator (@) status.
func (ch *Channel) AddClient(c *Client) {
	ch.mu.Lock()
	defer ch.mu.Unlock()

	isFirst := len(ch.clients) == 0
	ch.clients[c] = true

	if isFirst {
		ch.ops[c] = true
	}
}

// RemoveClient removes a client from the channel
func (ch *Channel) RemoveClient(c *Client) bool {
	ch.mu.Lock()
	defer ch.mu.Unlock()

	delete(ch.clients, c)
	delete(ch.protected, c)
	delete(ch.ops, c)
	delete(ch.halfops, c)
	delete(ch.voiced, c)
	delete(ch.invited, c)
	return len(ch.clients) == 0
}

// Broadcast sends an IRC line to all clients in the channel
func (ch *Channel) Broadcast(sender *Client, line string) {
	ch.mu.RLock()
	defer ch.mu.RUnlock()

	msg := []byte(line + "\r\n")
	for client := range ch.clients {
		if sender != nil && client == sender {
			continue
		}
		client.SendRaw(msg)
	}
}

// IsProtected checks if client has Protected (*) status (+q)
func (ch *Channel) IsProtected(c *Client) bool {
	ch.mu.RLock()
	defer ch.mu.RUnlock()
	return ch.protected[c]
}

// IsOp checks if client is channel operator (@) (+o)
func (ch *Channel) IsOp(c *Client) bool {
	ch.mu.RLock()
	defer ch.mu.RUnlock()
	return ch.ops[c]
}

// IsHalfOp checks if client is half-op (%) (+h)
func (ch *Channel) IsHalfOp(c *Client) bool {
	ch.mu.RLock()
	defer ch.mu.RUnlock()
	return ch.halfops[c] || ch.ops[c] || ch.protected[c]
}

// IsVoiced checks if client has voice status (+) (+v)
func (ch *Channel) IsVoiced(c *Client) bool {
	ch.mu.RLock()
	defer ch.mu.RUnlock()
	return ch.voiced[c] || ch.halfops[c] || ch.ops[c] || ch.protected[c]
}

// IsBanned checks if nick/mask is banned
func (ch *Channel) IsBanned(nick string) bool {
	ch.mu.RLock()
	defer ch.mu.RUnlock()
	normNick := strings.ToLower(nick)
	return ch.bans[normNick]
}

// IsInvited checks if client was invited
func (ch *Channel) IsInvited(c *Client) bool {
	ch.mu.RLock()
	defer ch.mu.RUnlock()
	return ch.invited[c]
}

// AddInvite adds client to invited list
func (ch *Channel) AddInvite(c *Client) {
	ch.mu.Lock()
	defer ch.mu.Unlock()
	ch.invited[c] = true
}

// SetProtected grants or revokes Protected (*) status (+q)
func (ch *Channel) SetProtected(c *Client, enable bool) {
	ch.mu.Lock()
	defer ch.mu.Unlock()
	if enable {
		ch.protected[c] = true
	} else {
		delete(ch.protected, c)
	}
}

// SetOp grants or revokes Operator (@) status (+o)
func (ch *Channel) SetOp(c *Client, enable bool) {
	ch.mu.Lock()
	defer ch.mu.Unlock()
	if enable {
		ch.ops[c] = true
	} else {
		delete(ch.ops, c)
	}
}

// SetHalfOp grants or revokes Half-Op (%) status (+h)
func (ch *Channel) SetHalfOp(c *Client, enable bool) {
	ch.mu.Lock()
	defer ch.mu.Unlock()
	if enable {
		ch.halfops[c] = true
	} else {
		delete(ch.halfops, c)
	}
}

// SetVoice grants or revokes Voice (+) status (+v)
func (ch *Channel) SetVoice(c *Client, enable bool) {
	ch.mu.Lock()
	defer ch.mu.Unlock()
	if enable {
		ch.voiced[c] = true
	} else {
		delete(ch.voiced, c)
	}
}

// SetBan adds or removes ban
func (ch *Channel) SetBan(mask string, enable bool) {
	ch.mu.Lock()
	defer ch.mu.Unlock()
	norm := strings.ToLower(mask)
	if enable {
		ch.bans[norm] = true
	} else {
		delete(ch.bans, norm)
	}
}

// GetNicks returns space-separated list of nicks with highest rank symbol (*, @, %, +)
func (ch *Channel) GetNicks() string {
	ch.mu.RLock()
	defer ch.mu.RUnlock()

	var nicks []string
	for client := range ch.clients {
		prefix := ""
		if ch.protected[client] {
			prefix = "*"
		} else if ch.ops[client] {
			prefix = "@"
		} else if ch.halfops[client] {
			prefix = "%"
		} else if ch.voiced[client] {
			prefix = "+"
		}
		nicks = append(nicks, prefix+client.Nick)
	}
	return strings.Join(nicks, " ")
}
