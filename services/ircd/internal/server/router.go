package server

import (
	"fmt"
	"strings"

	"github.com/Eran-Meir/IRC/services/ircd/internal/logger"
	"github.com/Eran-Meir/IRC/services/ircd/internal/parser"
	"github.com/Eran-Meir/IRC/services/ircd/internal/state"
)

const ServerName = "irc.enterprise.local"

// ProcessCommand dispatches IRC protocol commands according to RFC 1459
func (c *Client) ProcessCommand(msg *parser.Message) {
	switch strings.ToUpper(msg.Command) {
	case "NICK":
		c.handleNick(msg)
	case "USER":
		c.handleUser(msg)
	case "JOIN":
		c.handleJoin(msg)
	case "PART":
		c.handlePart(msg)
	case "PRIVMSG":
		c.handlePrivmsg(msg)
	case "PING":
		c.handlePing(msg)
	case "PONG":
		// Ignore PONG keepalive response
	case "QUIT":
		c.handleQuit(msg)
	default:
		logger.Debug("[%s] Unknown command: %s", c.Prefix(), msg.Command)
	}
}

func (c *Client) handleNick(msg *parser.Message) {
	if len(msg.Params) == 0 {
		c.SendRaw([]byte(fmt.Sprintf(":%s 431 :No nickname given\r\n", ServerName)))
		return
	}

	newNick := msg.Params[0]
	mgr := GetManager()

	if c.Nick != "" {
		// Nick Change
		oldPrefix := c.Prefix()
		mgr.UnregisterNick(c.Nick)
		c.Nick = newNick
		mgr.RegisterNick(newNick, c)

		changeLine := fmt.Sprintf(":%s NICK :%s", oldPrefix, newNick)
		c.SendRaw([]byte(changeLine + "\r\n"))

		c.mu.RLock()
		defer c.mu.RUnlock()
		for chName := range c.channels {
			if ch, exists := mgr.channels[chName]; exists {
				ch.Broadcast(c, changeLine)
			}
		}
	} else {
		// Registration Nick
		if !mgr.RegisterNick(newNick, c) {
			c.SendRaw([]byte(fmt.Sprintf(":%s 433 * %s :Nickname is already in use\r\n", ServerName, newNick)))
			return
		}
		c.Nick = newNick
		c.checkRegistration()
	}
}

func (c *Client) handleUser(msg *parser.Message) {
	if len(msg.Params) < 4 {
		c.SendRaw([]byte(fmt.Sprintf(":%s 461 * USER :Not enough parameters\r\n", ServerName)))
		return
	}

	c.User = msg.Params[0]
	c.RealName = msg.Params[3]
	c.checkRegistration()
}

func (c *Client) checkRegistration() {
	if !c.registered && c.Nick != "" && c.User != "" {
		c.registered = true
		c.SendRaw([]byte(fmt.Sprintf(":%s 001 %s :Welcome to the Modern IRC Network, %s!\r\n", ServerName, c.Nick, c.Prefix())))
		c.SendRaw([]byte(fmt.Sprintf(":%s 002 %s :Your host is %s, running version Go-IRCd-v0.4.0\r\n", ServerName, c.Nick, ServerName)))
		c.SendRaw([]byte(fmt.Sprintf(":%s 004 %s %s Go-IRCd-v0.4.0 o o\r\n", ServerName, c.Nick, ServerName)))
	}
}

func (c *Client) handleJoin(msg *parser.Message) {
	if !c.registered || len(msg.Params) == 0 {
		return
	}

	chName := msg.Params[0]
	if !strings.HasPrefix(chName, "#") {
		chName = "#" + chName
	}
	chName = strings.ToLower(chName)

	mgr := GetManager()
	ch := mgr.GetOrCreateChannel(chName)

	ch.AddClient(c)
	c.mu.Lock()
	c.channels[chName] = true
	c.mu.Unlock()

	joinLine := fmt.Sprintf(":%s JOIN :%s", c.Prefix(), chName)
	ch.Broadcast(nil, joinLine)

	// RPL_TOPIC (332)
	c.SendRaw([]byte(fmt.Sprintf(":%s 332 %s %s :%s\r\n", ServerName, c.Nick, chName, ch.Topic)))

	// RPL_NAMREPLY (353) & RPL_ENDOFNAMES (366)
	nicks := ch.GetNicks()
	c.SendRaw([]byte(fmt.Sprintf(":%s 353 %s = %s :%s\r\n", ServerName, c.Nick, chName, nicks)))
	c.SendRaw([]byte(fmt.Sprintf(":%s 366 %s %s :End of /NAMES list.\r\n", ServerName, c.Nick, chName)))
}

func (c *Client) handlePart(msg *parser.Message) {
	if !c.registered || len(msg.Params) == 0 {
		return
	}

	chName := strings.ToLower(msg.Params[0])
	if !strings.HasPrefix(chName, "#") {
		chName = "#" + chName
	}
	mgr := GetManager()

	c.mu.Lock()
	_, joined := c.channels[chName]
	delete(c.channels, chName)
	c.mu.Unlock()

	if joined {
		if ch, exists := mgr.channels[chName]; exists {
			reason := "Leaving"
			if len(msg.Params) > 1 {
				reason = msg.Params[1]
			}
			partLine := fmt.Sprintf(":%s PART %s :%s", c.Prefix(), chName, reason)
			ch.Broadcast(nil, partLine)
			ch.RemoveClient(c)
			mgr.RemoveChannelIfEmpty(chName)
		}
	}
}

func (c *Client) handlePrivmsg(msg *parser.Message) {
	if !c.registered || len(msg.Params) < 2 {
		return
	}

	target := msg.Params[0]
	text := msg.Params[1]

	mgr := GetManager()
	if strings.HasPrefix(target, "#") {
		target = strings.ToLower(target)
		line := fmt.Sprintf(":%s PRIVMSG %s :%s", c.Prefix(), target, text)
		// Publish to Valkey state layer for unified single-delivery cross-pod & local broadcasting
		state.PublishChannelMessage(target, line)
	} else {
		line := fmt.Sprintf(":%s PRIVMSG %s :%s", c.Prefix(), target, text)
		// Direct Message
		if targetClient := mgr.GetClientByNick(target); targetClient != nil {
			targetClient.SendRaw([]byte(line + "\r\n"))
		}
	}
}

func (c *Client) handlePing(msg *parser.Message) {
	target := ServerName
	if len(msg.Params) > 0 {
		target = msg.Params[0]
	}
	c.SendRaw([]byte(fmt.Sprintf(":%s PONG %s :%s\r\n", ServerName, ServerName, target)))
}

func (c *Client) handleQuit(msg *parser.Message) {
	reason := "Client quit"
	if len(msg.Params) > 0 {
		reason = msg.Params[0]
	}

	quitLine := fmt.Sprintf(":%s QUIT :%s", c.Prefix(), reason)
	c.broadcastQuit(quitLine)
}
