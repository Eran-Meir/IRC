package server

import (
	"fmt"
	"net"

	"github.com/Eran-Meir/IRC/services/ircd/internal/logger"
)

// Server represents the main IRC TCP Server
type Server struct {
	port string
}

// NewServer creates a new IRC Server instance
func NewServer(port string) *Server {
	return &Server{
		port: port,
	}
}

// Start opens the TCP socket and listens for incoming connections
func (s *Server) Start() error {
	address := fmt.Sprintf(":%s", s.port)
	listener, err := net.Listen("tcp", address)
	if err != nil {
		return err
	}
	defer listener.Close()

	for {
		conn, err := listener.Accept()
		if err != nil {
			logger.Error("Error accepting connection: %v", err)
			continue
		}

		// Spawn a lightweight goroutine for every new connection
		// This uses ~2KB of RAM per user, fulfilling our Bare Minimum rule!
		client := NewClient(conn)
		go client.Handle()
	}
}
