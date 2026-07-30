package main

import (
	"bufio"
	"flag"
	"fmt"
	"net"
	"os"
	"strings"
)

func main() {
	server := flag.String("server", "127.0.0.1:6667", "IRC server address (IP:PORT)")
	flag.Parse()

	fmt.Printf("Connecting to %s...\n", *server)
	conn, err := net.Dial("tcp", *server)
	if err != nil {
		fmt.Printf("Error connecting to server: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close()
	fmt.Println("Connected! Type your raw IRC commands below (e.g., JOIN #test). Press Ctrl+C to exit.")

	// Goroutine to read from server and print to stdout
	go func() {
		reader := bufio.NewReader(conn)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				fmt.Println("\nDisconnected from server.")
				os.Exit(0)
			}
			fmt.Print("<< " + line)
		}
	}()

	// Main loop to read from stdin and write to server
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		text := scanner.Text()
		if strings.TrimSpace(text) == "" {
			continue
		}
		
		// Send the command with \r\n as per IRC spec
		_, err := conn.Write([]byte(text + "\r\n"))
		if err != nil {
			fmt.Printf("Error sending data: %v\n", err)
			break
		}
	}
}
