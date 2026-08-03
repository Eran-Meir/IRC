package server

import (
	"bufio"
	"fmt"
	"net"
	"strings"
	"sync"

	"github.com/Eran-Meir/IRC/services/ircd/internal/logger"
	"github.com/Eran-Meir/IRC/services/ircd/internal/metrics"
	"github.com/Eran-Meir/IRC/services/ircd/internal/parser"
)

// Client represents a single connected TCP or WebSocket user
type Client struct {
	conn       net.Conn
	Nick       string
	User       string
	RealName   string
	registered bool
	channels   map[string]bool
	mu         sync.RWMutex
}

// NewClient initializes a new client object
func NewClient(conn net.Conn) *Client {
	metrics.ClientConnected()
	return &Client{
		conn:     conn,
		channels: make(map[string]bool),
	}
}

// Prefix returns standard IRC hostmask (nick!user@host)
func (c *Client) Prefix() string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	host := "local"
	if c.conn != nil && c.conn.RemoteAddr() != nil {
		host = c.conn.RemoteAddr().String()
	}

	nick := c.Nick
	if nick == "" {
		nick = "*"
	}
	user := c.User
	if user == "" {
		user = "user"
	}
	return fmt.Sprintf("%s!%s@%s", nick, user, host)
}

// SendRaw sends raw bytes to the client socket safely
func (c *Client) SendRaw(data []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil {
		c.conn.Write(data)
	}
}

func (c *Client) broadcastQuit(quitLine string) {
	mgr := GetManager()
	c.mu.RLock()
	defer c.mu.RUnlock()

	for chName := range c.channels {
		if ch, exists := mgr.channels[chName]; exists {
			ch.Broadcast(c, quitLine)
			ch.RemoveClient(c)
			mgr.RemoveChannelIfEmpty(chName)
		}
	}
}

// Handle reads raw data from the TCP socket line-by-line
func (c *Client) Handle() {
	defer func() {
		if c.Nick != "" {
			c.broadcastQuit(fmt.Sprintf(":%s QUIT :Client disconnected", c.Prefix()))
			GetManager().UnregisterNick(c.Nick)
		}
		metrics.ClientDisconnected()
		if c.conn != nil {
			c.conn.Close()
		}
	}()

	logger.Info("New connection from %s", c.conn.RemoteAddr().String())
	reader := bufio.NewReader(c.conn)

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			logger.Info("Connection closed by %s", c.conn.RemoteAddr().String())
			return
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		metrics.MessageProcessed()

		msg, err := parser.ParseLine(line)
		if err != nil {
			logger.Warn("[%s] Failed to parse message: %v", c.conn.RemoteAddr().String(), err)
			continue
		}

		c.ProcessCommand(msg)
	}
}
