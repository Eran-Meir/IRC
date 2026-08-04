package server

import (
	"fmt"
	"strings"

	"github.com/Eran-Meir/IRC/services/ircd/internal/auth"
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
	case "KICK":
		c.handleKick(msg)
	case "TOPIC":
		c.handleTopic(msg)
	case "MODE":
		c.handleMode(msg)
	case "INVITE":
		c.handleInvite(msg)
	case "NOTICE":
		c.handleNotice(msg)
	case "NAMES":
		c.handleNames(msg)
	case "WHOIS":
		c.handleWhois(msg)
	case "OPER":
		c.handleOper(msg)
	case "KLINE":
		c.handleKline(msg)
	case "REHASH":
		c.handleRehash(msg)
	case "LIST":
		c.handleList(msg)
	default:
		nick := c.Nick
		if nick == "" {
			nick = "*"
		}
		c.SendRaw([]byte(fmt.Sprintf(":%s 421 %s %s :Unknown command\r\n", ServerName, nick, msg.Command)))
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
		if strings.EqualFold(c.Nick, newNick) {
			return
		}
		// Try registering newNick first to prevent duplicate nick collision
		if !mgr.RegisterNick(newNick, c) {
			c.SendRaw([]byte(fmt.Sprintf(":%s 433 %s %s :Nickname is already in use\r\n", ServerName, c.Nick, newNick)))
			return
		}
		oldPrefix := c.Prefix()
		oldNick := c.Nick
		c.Nick = newNick
		mgr.UnregisterNick(oldNick)

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
	if !c.registered {
		c.SendRaw([]byte(fmt.Sprintf(":%s 451 * :You have not registered\r\n", ServerName)))
		return
	}
	if len(msg.Params) == 0 {
		c.SendRaw([]byte(fmt.Sprintf(":%s 461 %s JOIN :Not enough parameters\r\n", ServerName, c.Nick)))
		return
	}

	chName := msg.Params[0]
	if !strings.HasPrefix(chName, "#") {
		chName = "#" + chName
	}
	chName = strings.ToLower(chName)

	mgr := GetManager()
	ch := mgr.GetOrCreateChannel(chName)

	// Mode checks (+b, +i, +k, +l) - Server Admin (IsOper) overrides all
	if !c.IsOper() {
		if ch.IsBanned(c) {
			c.SendRaw([]byte(fmt.Sprintf(":%s 474 %s %s :Cannot join channel (+b)\r\n", ServerName, c.Nick, chName)))
			return
		}
		if ch.Modes['i'] && !ch.IsInvited(c) {
			c.SendRaw([]byte(fmt.Sprintf(":%s 473 %s %s :Cannot join channel (+i)\r\n", ServerName, c.Nick, chName)))
			return
		}
		if ch.Modes['k'] && (len(msg.Params) < 2 || msg.Params[1] != ch.Key) {
			c.SendRaw([]byte(fmt.Sprintf(":%s 475 %s %s :Cannot join channel (+k)\r\n", ServerName, c.Nick, chName)))
			return
		}
		if ch.Modes['l'] && ch.Limit > 0 && len(ch.clients) >= ch.Limit {
			c.SendRaw([]byte(fmt.Sprintf(":%s 471 %s %s :Cannot join channel (+l)\r\n", ServerName, c.Nick, chName)))
			return
		}
	}

	ch.AddClient(c)
	c.mu.Lock()
	c.channels[chName] = true
	c.mu.Unlock()

	joinLine := fmt.Sprintf(":%s JOIN :%s", c.Prefix(), chName)
	ch.Broadcast(nil, joinLine)

	// Broadcast updated RPL_NAMREPLY (353) to all channel members so everyone sees @ and + ranks
	nicks := ch.GetNicks()
	namesLine := fmt.Sprintf(":%s 353 %s = %s :%s", ServerName, c.Nick, chName, nicks)
	ch.Broadcast(nil, namesLine)
	ch.Broadcast(nil, fmt.Sprintf(":%s 366 %s %s :End of /NAMES list.", ServerName, c.Nick, chName))

	// RPL_TOPIC (332)
	c.SendRaw([]byte(fmt.Sprintf(":%s 332 %s %s :%s\r\n", ServerName, c.Nick, chName, ch.Topic)))
}

func (c *Client) handlePart(msg *parser.Message) {
	if !c.registered {
		c.SendRaw([]byte(fmt.Sprintf(":%s 451 * :You have not registered\r\n", ServerName)))
		return
	}
	if len(msg.Params) == 0 {
		c.SendRaw([]byte(fmt.Sprintf(":%s 461 %s PART :Not enough parameters\r\n", ServerName, c.Nick)))
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
	} else {
		c.SendRaw([]byte(fmt.Sprintf(":%s 442 %s %s :You're not on that channel\r\n", ServerName, c.Nick, chName)))
	}
}

func (c *Client) handlePrivmsg(msg *parser.Message) {
	if !c.registered {
		c.SendRaw([]byte(fmt.Sprintf(":%s 451 * :You have not registered\r\n", ServerName)))
		return
	}
	if len(msg.Params) < 1 {
		c.SendRaw([]byte(fmt.Sprintf(":%s 411 %s :No recipient given (PRIVMSG)\r\n", ServerName, c.Nick)))
		return
	}
	if len(msg.Params) < 2 {
		c.SendRaw([]byte(fmt.Sprintf(":%s 412 %s :No text to send\r\n", ServerName, c.Nick)))
		return
	}

	target := msg.Params[0]
	text := msg.Params[1]

	mgr := GetManager()
	if strings.HasPrefix(target, "#") {
		target = strings.ToLower(target)
		ch, exists := mgr.channels[target]
		if !exists {
			c.SendRaw([]byte(fmt.Sprintf(":%s 403 %s %s :No such channel\r\n", ServerName, c.Nick, target)))
			return
		}
		// Enforce membership: client must be joined to channel to send messages
		c.mu.RLock()
		_, joined := c.channels[target]
		c.mu.RUnlock()
		if !joined {
			c.SendRaw([]byte(fmt.Sprintf(":%s 404 %s %s :Cannot send to channel (you are not in channel)\r\n", ServerName, c.Nick, target)))
			return
		}
		// Check +m (moderated channel)
		if ch.Modes['m'] && !ch.IsVoiced(c) {
			c.SendRaw([]byte(fmt.Sprintf(":%s 404 %s %s :Cannot send to channel (+m)\r\n", ServerName, c.Nick, target)))
			return
		}
		line := fmt.Sprintf(":%s PRIVMSG %s :%s", c.Prefix(), target, text)
		state.PublishChannelMessage(target, line)
	} else {
		line := fmt.Sprintf(":%s PRIVMSG %s :%s", c.Prefix(), target, text)
		if targetClient := mgr.GetClientByNick(target); targetClient != nil {
			targetClient.SendRaw([]byte(line + "\r\n"))
		}
	}
}

func (c *Client) handleKick(msg *parser.Message) {
	if !c.registered || len(msg.Params) < 2 {
		return
	}
	chName := strings.ToLower(msg.Params[0])
	targetNick := msg.Params[1]
	reason := "Kicked"
	if len(msg.Params) > 2 {
		reason = msg.Params[2]
	}

	mgr := GetManager()
	if ch, exists := mgr.channels[chName]; exists {
		// Caller must be at least Half-Op (%) or Server Admin
		if !c.IsOper() && !ch.IsHalfOp(c) {
			c.SendRaw([]byte(fmt.Sprintf(":%s 482 %s %s :You're not channel operator\r\n", ServerName, c.Nick, chName)))
			return
		}

		targetClient := mgr.GetClientByNick(targetNick)
		if targetClient == nil {
			c.SendRaw([]byte(fmt.Sprintf(":%s 401 %s %s :No such nick/channel\r\n", ServerName, c.Nick, targetNick)))
			return
		}

		// KICK HIERARCHY RULES:
		// 1. Protected (*) target CANNOT be kicked by anyone unless caller is also Protected (*) or Server Admin!
		if ch.IsProtected(targetClient) && !c.IsOper() && !ch.IsProtected(c) {
			c.SendRaw([]byte(fmt.Sprintf(":%s 484 %s %s :Cannot kick protected user (*)\r\n", ServerName, c.Nick, chName)))
			return
		}

		// 2. Half-Op (%) caller can ONLY kick Voiced (+) and unranked users
		if !c.IsOper() && !ch.IsOp(c) && !ch.IsProtected(c) {
			if ch.IsHalfOp(targetClient) || ch.IsOp(targetClient) || ch.IsProtected(targetClient) {
				c.SendRaw([]byte(fmt.Sprintf(":%s 482 %s %s :Half-ops cannot kick ops or half-ops\r\n", ServerName, c.Nick, chName)))
				return
			}
		}

		kickLine := fmt.Sprintf(":%s KICK %s %s :%s", c.Prefix(), chName, targetNick, reason)
		ch.Broadcast(nil, kickLine)
		ch.RemoveClient(targetClient)
		targetClient.mu.Lock()
		delete(targetClient.channels, chName)
		targetClient.mu.Unlock()
	}
}

func (c *Client) handleTopic(msg *parser.Message) {
	if !c.registered || len(msg.Params) == 0 {
		return
	}
	chName := strings.ToLower(msg.Params[0])
	mgr := GetManager()
	if ch, exists := mgr.channels[chName]; exists {
		if len(msg.Params) > 1 {
			newTopic := msg.Params[1]
			if !c.IsOper() && !ch.IsHalfOp(c) && !ch.IsOp(c) && !ch.IsProtected(c) {
				c.SendRaw([]byte(fmt.Sprintf(":%s 482 %s %s :You're not channel operator\r\n", ServerName, c.Nick, chName)))
				return
			}
			ch.Topic = newTopic
			topicLine := fmt.Sprintf(":%s TOPIC %s :%s", c.Prefix(), chName, newTopic)
			ch.Broadcast(nil, topicLine)
			state.PublishChannelMessage(chName, topicLine)
		} else {
			c.SendRaw([]byte(fmt.Sprintf(":%s 332 %s %s :%s\r\n", ServerName, c.Nick, chName, ch.Topic)))
		}
	}
}

func (c *Client) handleInvite(msg *parser.Message) {
	if !c.registered || len(msg.Params) < 2 {
		return
	}
	targetNick := msg.Params[0]
	chName := strings.ToLower(msg.Params[1])
	mgr := GetManager()

	targetClient := mgr.GetClientByNick(targetNick)
	if targetClient == nil {
		c.SendRaw([]byte(fmt.Sprintf(":%s 401 %s %s :No such nick/channel\r\n", ServerName, c.Nick, targetNick)))
		return
	}

	if ch, exists := mgr.channels[chName]; exists {
		if ch.Modes['i'] && !c.IsOper() && !ch.IsOp(c) {
			c.SendRaw([]byte(fmt.Sprintf(":%s 482 %s %s :You're not channel operator\r\n", ServerName, c.Nick, chName)))
			return
		}
		ch.AddInvite(targetClient)
		c.SendRaw([]byte(fmt.Sprintf(":%s 341 %s %s %s\r\n", ServerName, c.Nick, targetNick, chName)))
		targetClient.SendRaw([]byte(fmt.Sprintf(":%s INVITE %s :%s\r\n", c.Prefix(), targetNick, chName)))
	}
}

func (c *Client) handleNotice(msg *parser.Message) {
	if !c.registered || len(msg.Params) < 2 {
		return
	}
	target := msg.Params[0]
	text := msg.Params[1]
	mgr := GetManager()

	if strings.HasPrefix(target, "#") {
		target = strings.ToLower(target)
		line := fmt.Sprintf(":%s NOTICE %s :%s", c.Prefix(), target, text)
		state.PublishChannelMessage(target, line)
	} else {
		line := fmt.Sprintf(":%s NOTICE %s :%s", c.Prefix(), target, text)
		if targetClient := mgr.GetClientByNick(target); targetClient != nil {
			targetClient.SendRaw([]byte(line + "\r\n"))
		}
	}
}

func (c *Client) handleNames(msg *parser.Message) {
	if !c.registered || len(msg.Params) == 0 {
		return
	}
	chName := strings.ToLower(msg.Params[0])
	mgr := GetManager()
	if ch, exists := mgr.channels[chName]; exists {
		nicks := ch.GetNicks()
		c.SendRaw([]byte(fmt.Sprintf(":%s 353 %s = %s :%s\r\n", ServerName, c.Nick, chName, nicks)))
		c.SendRaw([]byte(fmt.Sprintf(":%s 366 %s %s :End of /NAMES list.\r\n", ServerName, c.Nick, chName)))
	}
}

func (c *Client) handleMode(msg *parser.Message) {
	if !c.registered || len(msg.Params) == 0 {
		return
	}
	target := msg.Params[0]
	if !strings.HasPrefix(target, "#") {
		return
	}

	chName := strings.ToLower(target)
	mgr := GetManager()
	ch, exists := mgr.channels[chName]
	if !exists {
		return
	}

	if len(msg.Params) == 1 {
		modeStr := "+"
		for m := range ch.Modes {
			modeStr += string(m)
		}
		c.SendRaw([]byte(fmt.Sprintf(":%s 324 %s %s %s\r\n", ServerName, c.Nick, chName, modeStr)))
		return
	}

	if len(msg.Params) == 2 && (msg.Params[1] == "b" || msg.Params[1] == "+b") {
		for _, mask := range ch.GetBans() {
			c.SendRaw([]byte(fmt.Sprintf(":%s 367 %s %s %s\r\n", ServerName, c.Nick, chName, mask)))
		}
		c.SendRaw([]byte(fmt.Sprintf(":%s 368 %s %s :End of Channel Ban List\r\n", ServerName, c.Nick, chName)))
		return
	}

	if !c.IsOper() && !ch.IsOp(c) && !ch.IsProtected(c) {
		c.SendRaw([]byte(fmt.Sprintf(":%s 482 %s %s :You're not channel operator\r\n", ServerName, c.Nick, chName)))
		return
	}

	modesArg := msg.Params[1]
	adding := true
	paramIdx := 2

	for i := 0; i < len(modesArg); i++ {
		char := modesArg[i]
		if char == '+' {
			adding = true
			continue
		}
		if char == '-' {
			adding = false
			continue
		}

		switch char {
		case 'q':
			if paramIdx < len(msg.Params) {
				tNick := msg.Params[paramIdx]
				paramIdx++
				if !c.IsOper() && !ch.IsProtected(c) {
					c.SendRaw([]byte(fmt.Sprintf(":%s 482 %s %s :You are not a protected operator (+q)\r\n", ServerName, c.Nick, chName)))
					continue
				}
				if tClient := mgr.GetClientByNick(tNick); tClient != nil {
					ch.SetProtected(tClient, adding)
					modeLine := fmt.Sprintf(":%s MODE %s %c%c %s", c.Prefix(), chName, flagChar(adding), char, tNick)
					ch.Broadcast(nil, modeLine)
				}
			}
		case 'o':
			if paramIdx < len(msg.Params) {
				tNick := msg.Params[paramIdx]
				paramIdx++
				if tClient := mgr.GetClientByNick(tNick); tClient != nil {
					ch.SetOp(tClient, adding)
					modeLine := fmt.Sprintf(":%s MODE %s %c%c %s", c.Prefix(), chName, flagChar(adding), char, tNick)
					ch.Broadcast(nil, modeLine)
				}
			}
		case 'h':
			if paramIdx < len(msg.Params) {
				tNick := msg.Params[paramIdx]
				paramIdx++
				if tClient := mgr.GetClientByNick(tNick); tClient != nil {
					ch.SetHalfOp(tClient, adding)
					modeLine := fmt.Sprintf(":%s MODE %s %c%c %s", c.Prefix(), chName, flagChar(adding), char, tNick)
					ch.Broadcast(nil, modeLine)
				}
			}
		case 'v':
			if paramIdx < len(msg.Params) {
				tNick := msg.Params[paramIdx]
				paramIdx++
				if tClient := mgr.GetClientByNick(tNick); tClient != nil {
					ch.SetVoice(tClient, adding)
					modeLine := fmt.Sprintf(":%s MODE %s %c%c %s", c.Prefix(), chName, flagChar(adding), char, tNick)
					ch.Broadcast(nil, modeLine)
				}
			}
		case 'b':
			if paramIdx < len(msg.Params) {
				mask := msg.Params[paramIdx]
				paramIdx++
				ch.SetBan(mask, adding)
				modeLine := fmt.Sprintf(":%s MODE %s %c%c %s", c.Prefix(), chName, flagChar(adding), char, mask)
				ch.Broadcast(nil, modeLine)
			}
		case 'k':
			if adding && paramIdx < len(msg.Params) {
				ch.Key = msg.Params[paramIdx]
				paramIdx++
				ch.Modes['k'] = true
				modeLine := fmt.Sprintf(":%s MODE %s +k %s", c.Prefix(), chName, ch.Key)
				ch.Broadcast(nil, modeLine)
			} else if !adding {
				ch.Key = ""
				ch.Modes['k'] = false
				modeLine := fmt.Sprintf(":%s MODE %s -k", c.Prefix(), chName)
				ch.Broadcast(nil, modeLine)
			}
		case 'l':
			if adding && paramIdx < len(msg.Params) {
				var limit int
				fmt.Sscanf(msg.Params[paramIdx], "%d", &limit)
				paramIdx++
				ch.Limit = limit
				ch.Modes['l'] = true
				modeLine := fmt.Sprintf(":%s MODE %s +l %d", c.Prefix(), chName, limit)
				ch.Broadcast(nil, modeLine)
			} else if !adding {
				ch.Limit = 0
				ch.Modes['l'] = false
				modeLine := fmt.Sprintf(":%s MODE %s -l", c.Prefix(), chName)
				ch.Broadcast(nil, modeLine)
			}
		case 'm', 'i', 's', 'n', 't':
			if adding {
				ch.Modes[char] = true
			} else {
				delete(ch.Modes, char)
			}
			modeLine := fmt.Sprintf(":%s MODE %s %c%c", c.Prefix(), chName, flagChar(adding), char)
			ch.Broadcast(nil, modeLine)
		}
	}
}

func flagChar(adding bool) byte {
	if adding {
		return '+'
	}
	return '-'
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

func (c *Client) handleWhois(msg *parser.Message) {
	if !c.registered || len(msg.Params) == 0 {
		c.SendRaw([]byte(fmt.Sprintf(":%s 431 %s :No nickname given\r\n", ServerName, c.Nick)))
		return
	}

	targetNick := msg.Params[0]
	mgr := GetManager()
	targetClient := mgr.GetClientByNick(targetNick)
	if targetClient == nil {
		c.SendRaw([]byte(fmt.Sprintf(":%s 401 %s %s :No such nick/channel\r\n", ServerName, c.Nick, targetNick)))
		c.SendRaw([]byte(fmt.Sprintf(":%s 318 %s %s :End of /WHOIS list.\r\n", ServerName, c.Nick, targetNick)))
		return
	}

	// 311 RPL_WHOISUSER: <nick> <user> <host> * :<realname>
	c.SendRaw([]byte(fmt.Sprintf(":%s 311 %s %s %s %s * :%s\r\n", ServerName, c.Nick, targetClient.Nick, targetClient.User, targetClient.Host(), targetClient.RealName)))

	// 319 RPL_WHOISCHANNELS: <nick> :<channels>
	targetClient.mu.RLock()
	var chList []string
	for chName := range targetClient.channels {
		chList = append(chList, chName)
	}
	targetClient.mu.RUnlock()
	if len(chList) > 0 {
		c.SendRaw([]byte(fmt.Sprintf(":%s 319 %s %s :%s\r\n", ServerName, c.Nick, targetClient.Nick, strings.Join(chList, " "))))
	}

	// 312 RPL_WHOISSERVER: <nick> <server> :<server info>
	c.SendRaw([]byte(fmt.Sprintf(":%s 312 %s %s %s :Enterprise Go-IRCd Server\r\n", ServerName, c.Nick, targetClient.Nick, ServerName)))

	// 313 RPL_WHOISOPERATOR - Only sent if user authenticated via /oper
	if targetClient.IsServerAdmin() {
		c.SendRaw([]byte(fmt.Sprintf(":%s 313 %s %s :is an IRC Operator - Server Administrator\r\n", ServerName, c.Nick, targetClient.Nick)))
	} else if targetClient.IsOper() {
		c.SendRaw([]byte(fmt.Sprintf(":%s 313 %s %s :is an IRC Operator\r\n", ServerName, c.Nick, targetClient.Nick)))
	}

	// 318 RPL_ENDOFWHOIS: <nick> :End of /WHOIS list.
	c.SendRaw([]byte(fmt.Sprintf(":%s 318 %s %s :End of /WHOIS list.\r\n", ServerName, c.Nick, targetClient.Nick)))
}

func isAnyChannelOp(client *Client) bool {
	mgr := GetManager()
	client.mu.RLock()
	defer client.mu.RUnlock()

	for chName := range client.channels {
		if ch, exists := mgr.channels[chName]; exists {
			if ch.IsOp(client) || ch.IsProtected(client) || ch.IsHalfOp(client) {
				return true
			}
		}
	}
	return false
}

func (c *Client) handleList(msg *parser.Message) {
	if !c.registered {
		return
	}

	searchTerm := ""
	if len(msg.Params) > 0 {
		searchTerm = strings.ToLower(strings.Trim(msg.Params[0], "*"))
	}

	mgr := GetManager()
	mgr.mu.RLock()
	defer mgr.mu.RUnlock()

	// 321 RPL_LISTSTART: Channel :Users Name
	c.SendRaw([]byte(fmt.Sprintf(":%s 321 %s Channel :Users Name\r\n", ServerName, c.Nick)))

	for name, ch := range mgr.channels {
		if searchTerm == "" || strings.Contains(strings.ToLower(name), searchTerm) {
			ch.mu.RLock()
			userCount := len(ch.clients)
			topic := ch.Topic
			ch.mu.RUnlock()
			// 322 RPL_LIST: <channel> <# visible> :<topic>
			c.SendRaw([]byte(fmt.Sprintf(":%s 322 %s %s %d :%s\r\n", ServerName, c.Nick, name, userCount, topic)))
		}
	}

	// 323 RPL_LISTEND: :End of /LIST
	c.SendRaw([]byte(fmt.Sprintf(":%s 323 %s :End of /LIST\r\n", ServerName, c.Nick)))
}

func (c *Client) handleOper(msg *parser.Message) {
	if len(msg.Params) < 2 {
		c.SendRaw([]byte(fmt.Sprintf(":%s 461 %s OPER :Not enough parameters\r\n", ServerName, c.Nick)))
		return
	}
	user := msg.Params[0]
	pass := msg.Params[1]

	role, ok := auth.GetOperManager().Authenticate(user, pass)
	if ok {
		c.mu.Lock()
		c.isOper = true
		c.isServerAdmin = (role == "server_admin")
		c.mu.Unlock()
		// 381 RPL_YOUREOPER
		if role == "server_admin" {
			c.SendRaw([]byte(fmt.Sprintf(":%s 381 %s :You are now a Server Administrator\r\n", ServerName, c.Nick)))
		} else {
			c.SendRaw([]byte(fmt.Sprintf(":%s 381 %s :You are now an IRC operator\r\n", ServerName, c.Nick)))
		}
	} else {
		// 464 ERR_PASSWDMISMATCH
		c.SendRaw([]byte(fmt.Sprintf(":%s 464 %s :Password incorrect\r\n", ServerName, c.Nick)))
	}
}

func (c *Client) handleKline(msg *parser.Message) {
	if !c.IsOper() {
		c.SendRaw([]byte(fmt.Sprintf(":%s 481 %s :Permission Denied- You're not an IRC operator\r\n", ServerName, c.Nick)))
		return
	}

	reason := "K-lined"
	if len(msg.Params) > 2 {
		reason = msg.Params[2]
	} else if len(msg.Params) > 1 {
		reason = msg.Params[1]
	}

	mgr := GetManager()
	mgr.mu.RLock()
	defer mgr.mu.RUnlock()

	for _, client := range mgr.clients {
		if client != c {
			client.SendRaw([]byte(fmt.Sprintf("ERROR :Closing Link: %s (K-lined: %s)\r\n", client.Prefix(), reason)))
			if client.conn != nil {
				client.conn.Close()
			}
		}
	}
}

func (c *Client) handleRehash(msg *parser.Message) {
	if !c.IsOper() {
		c.SendRaw([]byte(fmt.Sprintf(":%s 481 %s :Permission Denied- You're not an IRC operator\r\n", ServerName, c.Nick)))
		return
	}

	_ = auth.GetOperManager().Reload()
	// 382 RPL_REHASHING
	c.SendRaw([]byte(fmt.Sprintf(":%s 382 %s opers.json :Rehashing server configuration\r\n", ServerName, c.Nick)))
}
