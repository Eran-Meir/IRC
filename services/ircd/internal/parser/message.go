package parser

// Message represents a parsed IRC message according to RFC 1459.
// The format is: [":" prefix SPACE] command [params] ["\r\n"]
type Message struct {
	Prefix  string   // Optional: The sender (e.g., "Eran!user@host")
	Command string   // Required: The action (e.g., "NICK", "JOIN", "PRIVMSG")
	Params  []string // Optional: The targets or text (e.g., ["#test", "Hello!"])
}
