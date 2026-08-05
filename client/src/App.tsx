import React, { useState, useEffect, useRef } from 'react';
import { TopMenuBar } from './components/TopMenuBar';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { UserList } from './components/UserList';
import { MessageInput } from './components/MessageInput';
import { BanListModal } from './components/BanListModal';
import { WebSocketService } from './services/websocket';
import { Message, Channel, UserPreferences } from './types/irc';
import './App.css';

export const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeTarget, setActiveTarget] = useState<string>('#enterprise');
  const [nick, setNick] = useState<string>(`Guest${Math.floor(Math.random() * 900 + 100)}`);
  const [banListMap, setBanListMap] = useState<Record<string, string[]>>({});
  const [banModalTarget, setBanModalTarget] = useState<string | null>(null);
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'classic-light',
    fontSize: '16px',
    fontFamily: 'fira-code',
    language: 'en',
    showUserList: true,
    showTimestamps: true,
  });

  const [channels, setChannels] = useState<Channel[]>([
    { name: '#enterprise', topic: 'Modern Enterprise IRC Network - Production Channel', unreadCount: 0, users: ['Operator'] },
    { name: '#devops', topic: 'Oracle Cloud & K3s GitOps Deployments', unreadCount: 0, users: ['SeniorDevOps'] },
  ]);

  const [messages, setMessages] = useState<Record<string, Message[]>>({
    Status: [
      { id: '1', sender: 'System', target: 'Status', text: 'Welcome to Enterprise IRC Web Client', timestamp: new Date().toLocaleTimeString(), isSystem: true },
    ],
    '#enterprise': [
      { id: '2', sender: 'System', target: '#enterprise', text: 'Now talking on #enterprise', timestamp: new Date().toLocaleTimeString(), isSystem: true },
    ],
  });

  const wsRef = useRef<WebSocketService | null>(null);
  const nickRef = useRef(nick);
  const joinedChannelsRef = useRef<Set<string>>(new Set());
  const handleIncomingLineRef = useRef<(line: string) => void>(() => {});

  useEffect(() => {
    nickRef.current = nick;
  }, [nick]);

  useEffect(() => {
    // Apply dataset attributes to root for CSS theme/font toggling
    document.documentElement.setAttribute('data-theme', preferences.theme);
    document.documentElement.setAttribute('data-fontsize', preferences.fontSize);
    document.documentElement.setAttribute('data-fontfamily', preferences.fontFamily);
    document.documentElement.setAttribute('dir', preferences.language === 'he' ? 'rtl' : 'ltr');
  }, [preferences]);

  // Global Window Switching Keyboard Shortcuts (Alt + 0..9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '0') {
          e.preventDefault();
          handleSelectTarget('Status');
        } else if (e.key >= '1' && e.key <= '9') {
          const idx = parseInt(e.key, 10) - 1;
          if (channels[idx]) {
            e.preventDefault();
            handleSelectTarget(channels[idx].name);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [channels]);

  const handleIncomingLine = (line: string) => {
    const time = new Date().toLocaleTimeString();

    // Silently handle PING/PONG keepalives
    if (line.startsWith('PING') || line.includes(' PING ')) {
      const pingArg = line.replace(/^:?[^ ]* PING :?/, '').replace(/^PING :?/, '').trim();
      if (wsRef.current) {
        wsRef.current.send(`PONG :${pingArg}`);
      }
      return;
    }

    if (line.includes(' PONG ') || line.startsWith('PONG ')) {
      return;
    }

    // Parse incoming RFC 1459 lines
    if (line.includes(' PRIVMSG ')) {
      const match = line.match(/^:([^!]+)![^ ]+ PRIVMSG ([^ ]+) :(.*)$/);
      if (match) {
        const [, sender, target, text] = match;

        if (!target.startsWith('#')) {
          // Direct Private Message
          const senderTarget = sender.toLowerCase();
          setChannels((prev) => {
            if (!prev.some((c) => c.name.toLowerCase() === senderTarget)) {
              return [...prev, { name: senderTarget, topic: 'Private Query', unreadCount: 1, users: [nick, sender] }];
            }
            return prev;
          });
          addMessage(senderTarget, {
            id: Math.random().toString(),
            sender,
            target: senderTarget,
            text,
            timestamp: time,
          });
          return;
        }

        const msgTarget = target.toLowerCase();
        // Check if message is a CTCP ACTION (/me)
        const actionMatch = text.match(/^\x01ACTION (.*)\x01$/);
        if (actionMatch) {
          addMessage(msgTarget, {
            id: Math.random().toString(),
            sender,
            target: msgTarget,
            text: actionMatch[1],
            timestamp: time,
            isAction: true,
          });
        } else {
          addMessage(msgTarget, {
            id: Math.random().toString(),
            sender,
            target: msgTarget,
            text,
            timestamp: time,
          });
        }
      }
    } else if (line.includes(' JOIN ')) {
      const match = line.match(/^:([^!]+)![^ ]+ JOIN :?([^ ]+)$/);
      if (match) {
        const [, sender, rawChannel] = match;
        const channel = rawChannel.startsWith('#') ? rawChannel.toLowerCase() : '#' + rawChannel.toLowerCase();
        
        // Add channel to sidebar if not present
        setChannels((prev) => {
          if (!prev.some((c) => c.name.toLowerCase() === channel)) {
            return [...prev, { name: channel, topic: 'Joined channel', unreadCount: 0, users: [sender] }];
          }
          return prev;
        });

        const isSelf = sender.toLowerCase() === nickRef.current.toLowerCase();
        const alreadyJoined = joinedChannelsRef.current.has(channel);

        // Add system join message ONLY when a user joins (suppress duplicate self-rejoin notices)
        if (!isSelf || !alreadyJoined) {
          addMessage(channel, {
            id: Math.random().toString(),
            sender: 'System',
            target: channel,
            text: `* ${sender} has joined ${channel}`,
            timestamp: time,
            isSystem: true,
          });
        }

        // Add user to channel user list cleanly
        const cleanSender = sender.replace(/^[*@%+]*/, '');
        setChannels((prev) =>
          prev.map((ch) => {
            if (ch.name.toLowerCase() === channel && !ch.users.some((u) => u.replace(/^[*@%+]*/, '') === cleanSender)) {
              return { ...ch, users: [...ch.users, sender] };
            }
            return ch;
          })
        );

        if (isSelf) {
          joinedChannelsRef.current.add(channel);
        }
      }
    } else if (line.includes(' PART ')) {
      const match = line.match(/^:([^!]+)![^ ]+ PART ([^ ]+)(?: :(.*))?$/);
      if (match) {
        const [, sender, rawChannel, reason] = match;
        const channel = rawChannel.startsWith('#') ? rawChannel.toLowerCase() : '#' + rawChannel.toLowerCase();
        const cleanSender = sender.replace(/^[*@%+]*/, '');
        addMessage(channel, {
          id: Math.random().toString(),
          sender: 'System',
          target: channel,
          text: `* ${sender} has left ${channel}${reason ? ` (${reason})` : ''}`,
          timestamp: time,
          isSystem: true,
        });

        // Remove user from channel user list
        setChannels((prev) =>
          prev.map((ch) => {
            if (ch.name.toLowerCase() === channel) {
              return { ...ch, users: ch.users.filter((u) => u.replace(/^[*@%+]*/, '') !== cleanSender) };
            }
            return ch;
          })
        );
      }
    } else if (line.includes(' QUIT ')) {
      const match = line.match(/^:([^!]+)![^ ]+ QUIT(?: :(.*))?$/);
      if (match) {
        const [, sender, reason] = match;
        const cleanSender = sender.replace(/^[*@%+]*/, '');

        // Log QUIT ONCE per channel user was in (outside state updater to prevent StrictMode duplicates)
        channels.forEach((ch) => {
          const hasUser = ch.users.some((u) => u.replace(/^[*@%+]*/, '') === cleanSender);
          if (hasUser) {
            addMessage(ch.name.toLowerCase(), {
              id: Math.random().toString(),
              sender: 'System',
              target: ch.name.toLowerCase(),
              text: `* ${sender} has quit IRC${reason ? ` (${reason})` : ''}`,
              timestamp: time,
              isSystem: true,
            });
          }
        });

        // Remove user from all channels cleanly
        setChannels((prev) =>
          prev.map((ch) => ({
            ...ch,
            users: ch.users.filter((u) => u.replace(/^[*@%+]*/, '') !== cleanSender),
          }))
        );
      }
    } else if (line.includes(' KICK ')) {
      const match = line.match(/^:([^!]+)![^ ]+ KICK ([^ ]+) ([^ ]+)(?: :(.*))?$/);
      if (match) {
        const [, kicker, rawChannel, targetNick, reason] = match;
        const channel = rawChannel.toLowerCase();
        const cleanTarget = targetNick.replace(/^[*@%+]*/, '');
        const isSelfKicked = cleanTarget.toLowerCase() === nickRef.current.toLowerCase();

        if (isSelfKicked) {
          joinedChannelsRef.current.delete(channel);
          addMessage(channel, {
            id: Math.random().toString(),
            sender: 'System',
            target: channel,
            text: `* You were kicked from ${channel} by ${kicker}${reason ? ` (${reason})` : ''}`,
            timestamp: time,
            isSystem: true,
          });
        } else {
          addMessage(channel, {
            id: Math.random().toString(),
            sender: 'System',
            target: channel,
            text: `* ${targetNick} was kicked from ${channel} by ${kicker}${reason ? ` (${reason})` : ''}`,
            timestamp: time,
            isSystem: true,
          });
        }

        // Remove kicked user from channel member list
        setChannels((prev) =>
          prev.map((ch) => {
            if (ch.name.toLowerCase() === channel) {
              return { ...ch, users: ch.users.filter((u) => u.replace(/^[*@%+]*/, '') !== cleanTarget) };
            }
            return ch;
          })
        );
      }
    } else if (line.includes(' TOPIC ')) {
      const match = line.match(/^:([^!]+)![^ ]+ TOPIC ([^ ]+) :(.*)$/);
      if (match) {
        const [, sender, rawChannel, newTopic] = match;
        const channel = rawChannel.toLowerCase();
        setChannels((prev) =>
          prev.map((ch) => (ch.name.toLowerCase() === channel ? { ...ch, topic: newTopic } : ch))
        );
        addMessage(channel, {
          id: Math.random().toString(),
          sender: 'System',
          target: channel,
          text: `* ${sender} changed topic to "${newTopic}"`,
          timestamp: time,
          isSystem: true,
        });
      }
    } else if (line.includes(' 332 ')) {
      // RPL_TOPIC :server 332 nick #channel :Topic text
      const match = line.match(/ 332 [^ ]+ ([#][^ ]+) :(.*)$/);
      if (match) {
        const [, rawChannel, topicText] = match;
        const channel = rawChannel.toLowerCase();
        const cleanTopic = topicText.trim();
        setChannels((prev) =>
          prev.map((ch) => (ch.name.toLowerCase() === channel ? { ...ch, topic: cleanTopic || 'No topic is set' } : ch))
        );
        addMessage(channel, {
          id: Math.random().toString(),
          sender: 'System',
          target: channel,
          text: cleanTopic ? `* Welcome to ${channel}! Topic is: "${cleanTopic}"` : `* Welcome to ${channel}! No topic is set.`,
          timestamp: time,
          isSystem: true,
        });
      }
    } else if (line.includes(' 331 ')) {
      // RPL_NOTOPIC :server 331 nick #channel :No topic is set
      const match = line.match(/ 331 [^ ]+ ([#][^ ]+)/);
      if (match) {
        const [, rawChannel] = match;
        const channel = rawChannel.toLowerCase();
        setChannels((prev) =>
          prev.map((ch) => (ch.name.toLowerCase() === channel ? { ...ch, topic: 'No topic is set' } : ch))
        );
        addMessage(channel, {
          id: Math.random().toString(),
          sender: 'System',
          target: channel,
          text: `* Welcome to ${channel}! No topic is set.`,
          timestamp: time,
          isSystem: true,
        });
      }
    } else if (line.includes(' 353 ')) {
      // RPL_NAMREPLY :server 353 nick = #channel :nick1 nick2
      const match = line.match(/ 353 [^ ]+ [=@*] ([#][^ ]+) :(.*)$/);
      if (match) {
        const [, rawChannel, userListStr] = match;
        const channel = rawChannel.toLowerCase();
        const nicks = userListStr.trim().split(/\s+/).filter(Boolean);

        setChannels((prev) =>
          prev.map((ch) => {
            if (ch.name.toLowerCase() === channel) {
              return { ...ch, users: nicks };
            }
            return ch;
          })
        );
      }
    } else if (line.includes(' NOTICE ')) {
      const match = line.match(/^:([^!]+)![^ ]+ NOTICE ([^ ]+) :(.*)$/);
      if (match) {
        const [, sender, target, text] = match;
        const msgTarget = target.startsWith('#') ? target.toLowerCase() : 'Status';
        addMessage(msgTarget, {
          id: Math.random().toString(),
          sender: `-${sender}-`,
          target: msgTarget,
          text,
          timestamp: time,
          isSystem: true,
        });
      }
    } else if (line.includes(' MODE ')) {
      const match = line.match(/^:([^!]+)![^ ]+ MODE ([^ ]+) (.*)$/);
      if (match) {
        const [, sender, rawChannel, modeText] = match;
        const channel = rawChannel.toLowerCase();

        const bMatch = modeText.match(/([+-])b\s+([^ ]+)/);
        if (bMatch) {
          const [, sign, mask] = bMatch;
          const normMask = mask.toLowerCase();
          setBanListMap((prev) => {
            const current = prev[channel] || [];
            if (sign === '+') {
              if (!current.includes(normMask)) return { ...prev, [channel]: [...current, normMask] };
            } else {
              return { ...prev, [channel]: current.filter((m) => m !== normMask) };
            }
            return prev;
          });
        }

        addMessage(channel, {
          id: Math.random().toString(),
          sender: 'System',
          target: channel,
          text: `* ${sender} sets mode: ${modeText}`,
          timestamp: time,
          isSystem: true,
        });
        if (wsRef.current) wsRef.current.send(`NAMES ${channel}`);
      }
    } else if (line.includes(' INVITE ')) {
      const match = line.match(/^:([^!]+)![^ ]+ INVITE [^ ]+ :?([^ ]+)$/);
      if (match) {
        const [, sender, rawChannel] = match;
        const channel = rawChannel.toLowerCase();
        addMessage('Status', {
          id: Math.random().toString(),
          sender: 'System',
          target: 'Status',
          text: `* ${sender} invited you to join ${channel}`,
          timestamp: time,
          isSystem: true,
        });
      }
    } else if (line.includes(' NICK ')) {
      const match = line.match(/^:([^!]+)![^ ]+ NICK :?([^ ]+)$/);
      if (match) {
        const [, oldNick, newNick] = match;
        if (oldNick.toLowerCase() === nick.toLowerCase()) {
          setNick(newNick);
        }
        setChannels((prev) =>
          prev.map((ch) => ({
            ...ch,
            users: ch.users.map((u) => {
              const m = u.match(/^([*@%+]?)(.*)$/);
              if (m && m[2].toLowerCase() === oldNick.toLowerCase()) {
                return m[1] + newNick;
              }
              return u;
            }),
          }))
        );
        addMessage(activeTarget.toLowerCase(), {
          id: Math.random().toString(),
          sender: 'System',
          target: activeTarget.toLowerCase(),
          text: `* ${oldNick} is now known as ${newNick}`,
          timestamp: time,
          isSystem: true,
        });
      }
    } else if (line.includes(' 474 ')) {
      // ERR_BANNEDFROMCHAN :server 474 nick #channel :Cannot join channel (+b)
      const match = line.match(/ 474 [^ ]+ ([#][^ ]+)/);
      if (match) {
        const channel = match[1].toLowerCase();
        joinedChannelsRef.current.delete(channel);
        const banMsg = `* Cannot join ${channel} — You are banned from this channel`;
        addMessage(channel, {
          id: Math.random().toString(),
          sender: 'System',
          target: channel,
          text: banMsg,
          timestamp: time,
          isSystem: true,
        });
        if (activeTarget.toLowerCase() !== channel) {
          addMessage(activeTarget.toLowerCase(), {
            id: Math.random().toString(),
            sender: 'System',
            target: activeTarget.toLowerCase(),
            text: banMsg,
            timestamp: time,
            isSystem: true,
          });
        }
      }
    } else if (line.includes(' 473 ')) {
      // ERR_INVITEONLYCHAN
      const match = line.match(/ 473 [^ ]+ ([#][^ ]+)/);
      if (match) {
        const channel = match[1].toLowerCase();
        joinedChannelsRef.current.delete(channel);
        const errMsg = `* Cannot join ${channel} — Channel is invite-only (+i)`;
        addMessage(channel, { id: Math.random().toString(), sender: 'System', target: channel, text: errMsg, timestamp: time, isSystem: true });
        if (activeTarget.toLowerCase() !== channel) {
          addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
        }
      }
    } else if (line.includes(' 475 ')) {
      // ERR_BADCHANNELKEY
      const match = line.match(/ 475 [^ ]+ ([#][^ ]+)/);
      if (match) {
        const channel = match[1].toLowerCase();
        joinedChannelsRef.current.delete(channel);
        const errMsg = `* Cannot join ${channel} — Invalid channel key (+k)`;
        addMessage(channel, { id: Math.random().toString(), sender: 'System', target: channel, text: errMsg, timestamp: time, isSystem: true });
        if (activeTarget.toLowerCase() !== channel) {
          addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
        }
      }
    } else if (line.includes(' 471 ')) {
      // ERR_CHANNELISFULL
      const match = line.match(/ 471 [^ ]+ ([#][^ ]+)/);
      if (match) {
        const channel = match[1].toLowerCase();
        joinedChannelsRef.current.delete(channel);
        const errMsg = `* Cannot join ${channel} — Channel is full (+l)`;
        addMessage(channel, { id: Math.random().toString(), sender: 'System', target: channel, text: errMsg, timestamp: time, isSystem: true });
        if (activeTarget.toLowerCase() !== channel) {
          addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
        }
      }
    } else if (line.includes(' 404 ')) {
      // ERR_CANNOTSENDTOCHAN
      const match = line.match(/ 404 [^ ]+ ([#][^ ]+)/);
      if (match) {
        const channel = match[1].toLowerCase();
        const errMsg = `* Cannot send message to ${channel} — You are not in the channel or banned`;
        addMessage(channel, { id: Math.random().toString(), sender: 'System', target: channel, text: errMsg, timestamp: time, isSystem: true });
      }
    } else if (line.includes(' 465 ')) {
      // ERR_YOUREBANNEDCREEP (K-LINE)
      const klineMsg = '* YOU ARE BANNED FROM THIS SERVER (K-LINED)';
      addMessage('Status', { id: Math.random().toString(), sender: 'System', target: 'Status', text: klineMsg, timestamp: time, isSystem: true });
      addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: klineMsg, timestamp: time, isSystem: true });
    } else if (line.includes(' 421 ')) {
      // ERR_UNKNOWNCOMMAND :server 421 nick CMD :Unknown command
      const match = line.match(/ 421 [^ ]+ ([^ ]+)/);
      const unknownCmd = match ? match[1] : 'COMMAND';
      const errMsg = `* Unknown command /${unknownCmd}. Type /help for available commands.`;
      addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
      if (activeTarget.toLowerCase() !== 'status') {
        addMessage('status', { id: Math.random().toString(), sender: 'System', target: 'status', text: errMsg, timestamp: time, isSystem: true });
      }
    } else if (line.includes(' 461 ')) {
      // ERR_NEEDMOREPARAMS :server 461 nick CMD :Not enough parameters
      const match = line.match(/ 461 [^ ]+ ([^ ]+)/);
      const cmdName = match ? match[1] : 'COMMAND';
      const errMsg = `* Command error: Not enough parameters for /${cmdName}`;
      addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
    } else if (line.includes(' 401 ')) {
      // ERR_NOSUCHNICK :server 401 nick target :No such nick/channel
      const match = line.match(/ 401 [^ ]+ ([^ ]+)/);
      const targetName = match ? match[1] : 'target';
      const errMsg = `* Error: No such nick or channel "${targetName}"`;
      addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
    } else if (line.includes(' 403 ')) {
      // ERR_NOSUCHCHANNEL :server 403 nick #chan :No such channel
      const match = line.match(/ 403 [^ ]+ ([^ ]+)/);
      const chanName = match ? match[1] : 'channel';
      const errMsg = `* Error: No such channel "${chanName}"`;
      addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
    } else if (line.includes(' 442 ')) {
      // ERR_NOTONCHANNEL :server 442 nick #chan :You're not on that channel
      const match = line.match(/ 442 [^ ]+ ([^ ]+)/);
      const chanName = match ? match[1] : 'channel';
      const errMsg = `* Error: You are not in ${chanName}`;
      addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
    } else if (line.includes(' 482 ')) {
      // ERR_CHANOPRIVSNEEDED :server 482 nick #chan :You're not channel operator
      const match = line.match(/ 482 [^ ]+ ([^ ]+)/);
      const chanName = match ? match[1] : activeTarget;
      const errMsg = `* Permission denied: You are not a channel operator in ${chanName}`;
      addMessage(chanName.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: chanName.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
      if (activeTarget.toLowerCase() !== chanName.toLowerCase()) {
        addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
      }
    } else if (line.includes(' 481 ')) {
      // ERR_NOPRIVILEGES :server 481 nick :Permission Denied- You're not an IRC operator
      const errMsg = "* Permission denied: You are not an IRC operator";
      addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
    } else if (line.includes(' 464 ')) {
      // ERR_PASSWDMISMATCH :server 464 nick :Password incorrect
      const errMsg = "* Error: OPER password incorrect";
      addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: errMsg, timestamp: time, isSystem: true });
      if (activeTarget.toLowerCase() !== 'status') {
        addMessage('status', { id: Math.random().toString(), sender: 'System', target: 'status', text: errMsg, timestamp: time, isSystem: true });
      }
    } else if (line.includes(' 381 ')) {
      // RPL_YOUREOPER :server 381 nick :You are now ...
      setIsOper(true);
      const match = line.match(/ 381 [^ ]+ :(.*)$/);
      const text = match ? match[1] : 'You are now an IRC operator';
      const msgText = `* Success: ${text}`;
      addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: msgText, timestamp: time, isSystem: true });
      if (activeTarget.toLowerCase() !== 'status') {
        addMessage('status', { id: Math.random().toString(), sender: 'System', target: 'status', text: msgText, timestamp: time, isSystem: true });
      }
    } else if (line.includes(' 382 ')) {
      // RPL_REHASHING :server 382 nick file :Rehash file
      const msgText = "* Success: Server configuration reloaded (REHASH)";
      addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: msgText, timestamp: time, isSystem: true });
    } else if (line.includes(' 313 ')) {
      // RPL_WHOISOPERATOR :server 313 nick target :is an IRC Operator ...
      const match = line.match(/ 313 [^ ]+ ([^ ]+) :(.*)$/);
      if (match) {
        const [, targetNick, operRoleText] = match;
        const msgText = `* ${targetNick} ${operRoleText}`;
        addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: msgText, timestamp: time, isWhois: true });
        if (activeTarget.toLowerCase() !== 'status') {
          addMessage('status', { id: Math.random().toString(), sender: 'System', target: 'status', text: msgText, timestamp: time, isWhois: true });
        }
      }
    } else if (line.match(/ (311|312|318|319) /)) {
      // RPL_WHOISUSER, RPL_WHOISSERVER, RPL_ENDOFWHOIS, RPL_WHOISCHANNELS
      const cleanedLine = line.replace(/^:[^ ]+ \d{3} [^ ]+ :?/, '').replace(/^:[^ ]+ NOTICE [^ ]+ :?/, '');
      if (cleanedLine.trim()) {
        addMessage(activeTarget.toLowerCase(), {
          id: Math.random().toString(),
          sender: 'System',
          target: activeTarget.toLowerCase(),
          text: cleanedLine,
          timestamp: time,
          isWhois: true,
        });
        if (activeTarget.toLowerCase() !== 'status') {
          addMessage('status', {
            id: Math.random().toString(),
            sender: 'System',
            target: 'status',
            text: cleanedLine,
            timestamp: time,
            isWhois: true,
          });
        }
      }
    } else if (line.includes(' 367 ')) {
      // RPL_BANLIST :server 367 nick #channel mask
      const match = line.match(/ 367 [^ ]+ ([#][^ ]+) ([^ ]+)/);
      if (match) {
        const [, rawChannel, mask] = match;
        const channel = rawChannel.toLowerCase();
        const normMask = mask.toLowerCase();
        setBanListMap((prev) => {
          const current = prev[channel] || [];
          if (!current.includes(normMask)) {
            return { ...prev, [channel]: [...current, normMask] };
          }
          return prev;
        });
      }
    } else if (line.includes(' 368 ')) {
      // RPL_ENDOFBANLIST :server 368 nick #channel :End of Channel Ban List
      return;
    } else if (line.includes(' 366 ')) {
      // RPL_ENDOFNAMES :server 366 nick #channel :End of /NAMES list.
      return;
    } else {
      // Cleanly format system banners, LIST, and MOTD numerics
      const cleanedLine = line.replace(/^:[^ ]+ \d{3} [^ ]+ :?/, '').replace(/^:[^ ]+ NOTICE [^ ]+ :?/, '');
      if (cleanedLine.trim()) {
        addMessage(activeTarget.toLowerCase(), {
          id: Math.random().toString(),
          sender: 'System',
          target: activeTarget.toLowerCase(),
          text: cleanedLine,
          timestamp: time,
          isSystem: true,
        });
        if (activeTarget.toLowerCase() !== 'status') {
          addMessage('status', {
            id: Math.random().toString(),
            sender: 'System',
            target: 'status',
            text: cleanedLine,
            timestamp: time,
            isSystem: true,
          });
        }
      }
    }
  };

  useEffect(() => {
    handleIncomingLineRef.current = handleIncomingLine;
  });

  const addMessage = (target: string, msg: Message) => {
    const normTarget = target.toLowerCase();
    setMessages((prev) => ({
      ...prev,
      [normTarget]: [...(prev[normTarget] || []), msg],
    }));
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    wsRef.current = new WebSocketService(
      wsUrl,
      (line: string) => handleIncomingLineRef.current(line),
      (status) => {
        setIsConnected(status);
        if (status && wsRef.current) {
          // Perform automatic registration on connect
          wsRef.current.send(`NICK ${nickRef.current}`);
          wsRef.current.send(`USER ${nickRef.current} 0 * :Web Client User`);
          wsRef.current.send(`JOIN #enterprise`);
          wsRef.current.send(`JOIN #devops`);
          // Seed joinedChannelsRef so message sending is not blocked
          joinedChannelsRef.current.add('#enterprise');
          joinedChannelsRef.current.add('#devops');
        }
      }
    );
    wsRef.current.connect();
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.send(`QUIT :Web client closed`);
      wsRef.current.disconnect();
    }
    setIsConnected(false);
  };

  useEffect(() => {
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  const handleSendMessage = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 1) {
      lines.forEach((line) => sendSingleMessage(line));
      return;
    }
    sendSingleMessage(rawText);
  };

  const sendSingleMessage = (text: string) => {
    const time = new Date().toLocaleTimeString();

    let processedText = text;
    if (processedText.startsWith('/') && activeTarget.startsWith('#')) {
      const parts = processedText.slice(1).split(' ');
      const expandedParts = parts.map((part, idx) => (idx > 0 && part === '#' ? activeTarget : part));
      processedText = '/' + expandedParts.join(' ');
    }

    if (processedText.startsWith('/')) {
      // Handle slash commands
      const parts = processedText.slice(1).split(' ');
      let cmd = parts[0].toUpperCase();
      const arg = parts.slice(1).join(' ');

      if (cmd === 'MESSAGE') cmd = 'MSG';
      else if (cmd === 'Q') cmd = 'QUERY';
      else if (cmd === 'J') cmd = 'JOIN';
      else if (cmd === 'P') cmd = 'PART';
      else if (cmd === 'W') cmd = 'WHOIS';
      else if (cmd === 'KB') cmd = 'KICKBAN';

      if ((cmd === 'JOIN' || cmd === 'J') && arg) {
        const trimmed = arg.trim();
        const channelName = (trimmed.startsWith('#') ? trimmed : '#' + trimmed).toLowerCase();
        if (!channels.some((c) => c.name.toLowerCase() === channelName)) {
          setChannels((prev) => [
            ...prev,
            { name: channelName, topic: 'Joined channel', unreadCount: 0, users: [] },
          ]);
        }
        joinedChannelsRef.current.add(channelName);
        if (wsRef.current) {
          wsRef.current.send(`JOIN ${channelName}`);
        }
        setActiveTarget(channelName);
      } else if (cmd === 'REJOIN') {
        const channelName = (arg || activeTarget).toLowerCase();
        if (channelName.startsWith('#')) {
          joinedChannelsRef.current.delete(channelName);
          if (wsRef.current) {
            wsRef.current.send(`PART ${channelName} :Rejoining`);
            wsRef.current.send(`JOIN ${channelName}`);
          }
          joinedChannelsRef.current.add(channelName);
          setActiveTarget(channelName);
          addMessage(channelName, {
            id: Math.random().toString(),
            sender: 'System',
            target: channelName,
            text: `* Rejoining ${channelName}...`,
            timestamp: time,
            isSystem: true,
          });
        }
      } else if (cmd === 'NICK' && arg) {
        if (wsRef.current) wsRef.current.send(`NICK ${arg}`);
        setNick(arg);
      } else if (cmd === 'PART') {
        const channelName = (arg || activeTarget).toLowerCase();
        if (wsRef.current) wsRef.current.send(`PART ${channelName}`);
        handlePartChannel(channelName);
      } else if (cmd === 'WHOIS' && arg) {
        if (wsRef.current) wsRef.current.send(`WHOIS ${arg}`);
        setActiveTarget('Status');
      } else if ((cmd === 'MSG' || cmd === 'PRIVMSG' || cmd === 'QUERY') && arg) {
        const firstSpace = arg.indexOf(' ');
        let targetNick = arg.trim().toLowerCase();
        let msgBody = '';
        if (firstSpace > -1) {
          targetNick = arg.slice(0, firstSpace).trim().toLowerCase();
          msgBody = arg.slice(firstSpace + 1);
        }
        if (targetNick.startsWith('#')) {
          targetNick = targetNick.slice(1);
        }
        if (targetNick) {
          if (!channels.some((c) => c.name.toLowerCase() === targetNick)) {
            setChannels((prev) => [
              ...prev,
              { name: targetNick, topic: 'Private Query', unreadCount: 0, users: [nick, targetNick] },
            ]);
          }
          setActiveTarget(targetNick);
          if (msgBody && wsRef.current) {
            wsRef.current.send(`PRIVMSG ${targetNick} :${msgBody}`);
            addMessage(targetNick, {
              id: Math.random().toString(),
              sender: nick,
              target: targetNick,
              text: msgBody,
              timestamp: time,
            });
          }
        }
      } else if (cmd === 'ME' && arg) {
        if (wsRef.current) wsRef.current.send(`PRIVMSG ${activeTarget} :\x01ACTION ${arg}\x01`);
      } else if (cmd === 'KICK' && arg) {
        let channel = activeTarget;
        let targetNick = '';
        let reason = 'Kicked';

        if (arg.startsWith('#')) {
          const parts = arg.split(' ');
          channel = parts[0].toLowerCase();
          targetNick = parts[1] || '';
          if (parts.length > 2) reason = parts.slice(2).join(' ');
        } else {
          const parts = arg.split(' ');
          targetNick = parts[0];
          if (parts.length > 1) reason = parts.slice(1).join(' ');
        }

        if (wsRef.current && targetNick) {
          wsRef.current.send(`KICK ${channel} ${targetNick} :${reason}`);
        }
      } else if ((cmd === 'KB' || cmd === 'KICKBAN') && arg) {
        let channel = activeTarget;
        let targetNick = '';
        let reason = 'Banned from channel';

        if (arg.startsWith('#')) {
          const parts = arg.split(' ');
          channel = parts[0].toLowerCase();
          targetNick = parts[1] || '';
          if (parts.length > 2) reason = parts.slice(2).join(' ');
        } else {
          const parts = arg.split(' ');
          targetNick = parts[0];
          if (parts.length > 1) reason = parts.slice(1).join(' ');
        }

        if (wsRef.current && targetNick) {
          wsRef.current.send(`MODE ${channel} +b ${targetNick}!*@*`);
          wsRef.current.send(`KICK ${channel} ${targetNick} :${reason}`);
        }
      } else if (cmd === 'TOPIC') {
        let channel = activeTarget;
        let newTopic = arg;

        if (arg.startsWith('#')) {
          const firstSpace = arg.indexOf(' ');
          if (firstSpace > -1) {
            channel = arg.slice(0, firstSpace).toLowerCase();
            newTopic = arg.slice(firstSpace + 1);
          } else {
            channel = arg.toLowerCase();
            newTopic = '';
          }
        }

        if (wsRef.current) {
          wsRef.current.send(`TOPIC ${channel}${newTopic ? ' :' + newTopic : ''}`);
        }
      } else if (cmd === 'MODE') {
        const modeArgs = arg.startsWith('#') ? arg : `${activeTarget} ${arg}`;
        if (wsRef.current) wsRef.current.send(`MODE ${modeArgs}`);
      } else if (cmd === 'INVITE' && arg) {
        const parts = arg.split(' ');
        const targetNick = parts[0];
        const channel = parts[1] ? parts[1].toLowerCase() : activeTarget;
        if (wsRef.current) wsRef.current.send(`INVITE ${targetNick} ${channel}`);
      } else if (cmd === 'NOTICE' && arg) {
        const firstSpace = arg.indexOf(' ');
        if (firstSpace > -1) {
          const target = arg.slice(0, firstSpace).toLowerCase();
          const noticeMsg = arg.slice(firstSpace + 1);
          if (wsRef.current) wsRef.current.send(`NOTICE ${target} :${noticeMsg}`);
          addMessage(target, {
            id: Math.random().toString(),
            sender: `-${nick}-`,
            target,
            text: noticeMsg,
            timestamp: time,
          });
        }
      } else if (cmd === 'NAMES') {
        const channel = (arg || activeTarget).toLowerCase();
        if (wsRef.current) wsRef.current.send(`NAMES ${channel}`);
      } else if (cmd === 'LIST') {
        if (wsRef.current) wsRef.current.send(`LIST${arg ? ' ' + arg : ''}`);
        setActiveTarget('Status');
      } else if (cmd === 'QUIT') {
        if (wsRef.current) wsRef.current.send(`QUIT${arg ? ' :' + arg : ''}`);
        disconnectWebSocket();
      } else if (cmd === 'CLEAR') {
        setMessages((prev) => ({ ...prev, [activeTarget.toLowerCase()]: [] }));
      } else if (cmd === 'HELP') {
        const helpMsg = '* Available commands: /join (#chan), /part (#chan), /nick (newnick), /msg (nick text), /notice (target text), /whois (nick), /topic (text), /kick (nick), /mode (args), /oper (user pass), /kline (mask), /rehash, /names, /list, /clear';
        addMessage(activeTarget.toLowerCase(), { id: Math.random().toString(), sender: 'System', target: activeTarget.toLowerCase(), text: helpMsg, timestamp: time, isSystem: true });
      } else {
        if (wsRef.current && isConnected) {
          wsRef.current.send(`${cmd}${arg ? ' ' + arg : ''}`);
        } else {
          addMessage(activeTarget.toLowerCase(), {
            id: Math.random().toString(),
            sender: 'System',
            target: activeTarget.toLowerCase(),
            text: `* Unknown command: /${cmd}. Type /help for available commands.`,
            timestamp: time,
            isSystem: true,
          });
        }
      }
      return;
    }

    // Normal PRIVMSG
    const normTarget = activeTarget.toLowerCase();
    if (normTarget.startsWith('#')) {
      if (!joinedChannelsRef.current.has(normTarget) && !channels.some((c) => c.name.toLowerCase() === normTarget)) {
        addMessage(normTarget, {
          id: Math.random().toString(),
          sender: 'System',
          target: normTarget,
          text: `* You cannot send messages to ${normTarget} because you are not in that channel. Type /join ${normTarget} to re-join.`,
          timestamp: time,
          isSystem: true,
        });
        return;
      }
      joinedChannelsRef.current.add(normTarget);
      if (wsRef.current) wsRef.current.send(`PRIVMSG ${normTarget} :${text}`);
    } else if (normTarget !== 'status' && wsRef.current) {
      wsRef.current.send(`PRIVMSG ${normTarget} :${text}`);
      addMessage(normTarget, {
        id: Math.random().toString(),
        sender: nick,
        target: normTarget,
        text,
        timestamp: time,
      });
    }
  };

  const handlePartChannel = (channelName: string) => {
    const normName = channelName.toLowerCase();
    joinedChannelsRef.current.delete(normName);
    setChannels((prev) => prev.filter((c) => c.name.toLowerCase() !== normName));
    if (activeTarget.toLowerCase() === normName) {
      setActiveTarget('#enterprise');
    }
  };

  const handleOpenBanList = (channelName: string) => {
    const norm = channelName.toLowerCase();
    setBanListMap((prev) => ({ ...prev, [norm]: [] }));
    if (wsRef.current) {
      wsRef.current.send(`MODE ${norm} +b`);
    }
    setBanModalTarget(norm);
  };

  const handleAddBan = (channelName: string, mask: string) => {
    const norm = channelName.toLowerCase();
    if (wsRef.current) {
      wsRef.current.send(`MODE ${norm} +b ${mask}`);
    }
  };

  const handleRemoveBan = (channelName: string, mask: string) => {
    const norm = channelName.toLowerCase();
    if (wsRef.current) {
      wsRef.current.send(`MODE ${norm} -b ${mask}`);
    }
  };

  const handleRemoveAllBans = (channelName: string) => {
    const norm = channelName.toLowerCase();
    const activeBans = banListMap[norm] || [];
    if (wsRef.current && activeBans.length > 0) {
      activeBans.forEach((mask) => {
        wsRef.current?.send(`MODE ${norm} -b ${mask}`);
      });
    }
    setBanListMap((prev) => ({ ...prev, [norm]: [] }));
  };

  const isOpInChannel = (channelName: string) => {
    if (isOper) return true;
    const norm = channelName.toLowerCase();
    const ch = channels.find((c) => c.name.toLowerCase() === norm);
    if (!ch) return false;
    const cleanNick = nick.toLowerCase();
    return ch.users.some((u) => {
      const isOpSymbol = u.startsWith('@') || u.startsWith('*') || u.startsWith('%');
      const uNick = u.replace(/^[*@%+]*/, '').toLowerCase();
      return isOpSymbol && uNick === cleanNick;
    });
  };

  const handleSelectTarget = (target: string) => {
    const normTarget = target.toLowerCase();
    setActiveTarget(normTarget);
    if (normTarget.startsWith('#') && wsRef.current && !joinedChannelsRef.current.has(normTarget)) {
      joinedChannelsRef.current.add(normTarget);
      wsRef.current.send(`JOIN ${normTarget}`);
    }
  };

  const handleQueryUser = (targetNick: string) => {
    const normNick = targetNick.toLowerCase();
    setChannels((prev) => {
      if (!prev.some((c) => c.name.toLowerCase() === normNick)) {
        return [...prev, { name: normNick, topic: 'Private Query', unreadCount: 0, users: [nick, targetNick] }];
      }
      return prev;
    });
    setActiveTarget(normNick);
  };

  const currentChannel = channels.find((c) => c.name.toLowerCase() === activeTarget.toLowerCase());
  const currentMessages = messages[activeTarget.toLowerCase()] || [];

  return (
    <div className="app-container">
      <TopMenuBar
        isConnected={isConnected}
        preferences={preferences}
        onUpdatePreferences={(updated) => setPreferences((prev) => ({ ...prev, ...updated }))}
        onConnect={connectWebSocket}
        onDisconnect={disconnectWebSocket}
        onClear={() => setMessages((prev) => ({ ...prev, [activeTarget]: [] }))}
      />

      <div className="main-layout">
        <Sidebar
          nick={nick}
          channels={channels}
          activeTarget={activeTarget}
          onSelectTarget={handleSelectTarget}
          onPartChannel={handlePartChannel}
          onOpenBanList={handleOpenBanList}
        />

        <ChatArea
          activeTarget={activeTarget}
          activeChannel={currentChannel}
          messages={currentMessages}
          isRtlLanguage={preferences.language === 'he'}
          onOpenBanList={handleOpenBanList}
          onJoinChannel={handleSelectTarget}
        />

        {preferences.showUserList && currentChannel && (
          <UserList
            users={currentChannel.users}
            activeChannel={activeTarget}
            onQueryUser={handleQueryUser}
            onSendCommand={handleSendMessage}
          />
        )}
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        activeTarget={activeTarget}
        isRtlLanguage={preferences.language === 'he'}
        channelUsers={currentChannel ? currentChannel.users : []}
        availableChannels={channels.map((c) => c.name)}
      />

      {banModalTarget && (
        <BanListModal
          channel={banModalTarget}
          bans={banListMap[banModalTarget.toLowerCase()] || []}
          isOp={isOpInChannel(banModalTarget)}
          onClose={() => setBanModalTarget(null)}
          onAddBan={handleAddBan}
          onRemoveBan={handleRemoveBan}
          onRemoveAllBans={handleRemoveAllBans}
        />
      )}
    </div>
  );
};

export default App;
