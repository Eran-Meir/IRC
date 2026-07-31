package server

import (
	"bufio"
	"net"
	"strings"

	"github.com/Eran-Meir/IRC/services/ircd/internal/logger"
	"github.com/Eran-Meir/IRC/services/ircd/internal/parser"
)

// Client represents a single connected TCP user
type Client struct {
	conn net.Conn
}

// NewClient initializes a new client object
func NewClient(conn net.Conn) *Client {
	return &Client{
		conn: conn,
	}
}

// Handle reads raw data from the TCP socket line-by-line
func (c *Client) Handle() {
	defer c.conn.Close()
	logger.Info("New connection from %s", c.conn.RemoteAddr().String())

	// Verification Test for CI/CD
	c.conn.Write([]byte("Welcome to the Go IRC Server! [Build Version Y (GitOps Verified)]\r\n"))

	reader := bufio.NewReader(c.conn)

	for {
		// IRC protocol specifies \r\n (CRLF) as the line delimiter
		line, err := reader.ReadString('\n')
		if err != nil {
			logger.Info("Connection closed by %s", c.conn.RemoteAddr().String())
			return
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Parse the line according to RFC 1459
		msg, err := parser.ParseLine(line)
		if err != nil {
			logger.Warn("[%s] Failed to parse message: %v", c.conn.RemoteAddr().String(), err)
			continue
		}

		logger.Debug("[%s] Parsed Command: %s, Params: %v", c.conn.RemoteAddr().String(), msg.Command, msg.Params)
	}
}
