package parser

import (
	"errors"
	"strings"
)

var (
	ErrEmptyMessage = errors.New("empty message")
	ErrInvalidFormat = errors.New("invalid message format")
)

// ParseLine takes a raw IRC message (e.g., ":Eran!user@host PRIVMSG #test :hello world")
// and parses it into a Message struct.
func ParseLine(raw string) (*Message, error) {
	// Strip trailing CRLF or LF
	raw = strings.TrimSuffix(raw, "\r\n")
	raw = strings.TrimSuffix(raw, "\n")
	raw = strings.TrimSpace(raw) // also trim any leading/trailing spaces

	if len(raw) == 0 {
		return nil, ErrEmptyMessage
	}

	msg := &Message{
		Params: make([]string, 0),
	}

	// 1. Check for Prefix
	if raw[0] == ':' {
		spaceIdx := strings.IndexByte(raw, ' ')
		if spaceIdx == -1 {
			// A message cannot be just a prefix
			return nil, ErrInvalidFormat
		}
		msg.Prefix = raw[1:spaceIdx]
		// Advance the string past the prefix and any extra spaces
		raw = strings.TrimSpace(raw[spaceIdx:])
	}

	if len(raw) == 0 {
		return nil, ErrInvalidFormat
	}

	// 2. Check if there is a "trailing" parameter (which starts with a colon and can contain spaces)
	trailingIdx := strings.Index(raw, " :")
	var trailing string
	hasTrailing := false

	if trailingIdx != -1 {
		trailing = raw[trailingIdx+2:] // +2 to skip " :"
		raw = raw[:trailingIdx]
		hasTrailing = true
	}

	// 3. Extract Command and middle Params
	parts := strings.Split(raw, " ")
	
	// Filter out any empty strings caused by multiple consecutive spaces
	var validParts []string
	for _, p := range parts {
		if p != "" {
			validParts = append(validParts, p)
		}
	}

	if len(validParts) == 0 {
		return nil, ErrInvalidFormat
	}

	msg.Command = strings.ToUpper(validParts[0])
	
	if len(validParts) > 1 {
		msg.Params = append(msg.Params, validParts[1:]...)
	}

	if hasTrailing {
		msg.Params = append(msg.Params, trailing)
	}

	return msg, nil
}
