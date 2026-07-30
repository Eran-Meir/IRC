package server

import (
	"bufio"
	"log"
	"net"
	"strings"
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
	log.Printf("New connection from %s", c.conn.RemoteAddr().String())

	reader := bufio.NewReader(c.conn)

	for {
		// IRC protocol specifies \r\n (CRLF) as the line delimiter
		line, err := reader.ReadString('\n')
		if err != nil {
			log.Printf("Connection closed by %s", c.conn.RemoteAddr().String())
			return
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Phase 3 will parse this line according to RFC 1459.
		// For now, just log the raw socket data!
		log.Printf("[%s] -> %s", c.conn.RemoteAddr().String(), line)
	}
}
