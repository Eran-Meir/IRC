import React, { useState, useEffect, useRef } from 'react';
import { TopMenuBar } from './components/TopMenuBar';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { UserList } from './components/UserList';
import { MessageInput } from './components/MessageInput';
import { WebSocketService } from './services/websocket';
import { Message, Channel, UserPreferences } from './types/irc';
import './App.css';

export const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeTarget, setActiveTarget] = useState<string>('#enterprise');
  const [nick, setNick] = useState<string>(`Guest${Math.floor(Math.random() * 900 + 100)}`);
  
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

        // Add system join message ONLY when a user joins
        addMessage(channel, {
          id: Math.random().toString(),
          sender: 'System',
          target: channel,
          text: `* ${sender} has joined ${channel}`,
          timestamp: time,
          isSystem: true,
        });

        // Add user to channel user list
        setChannels((prev) =>
          prev.map((ch) => {
            if (ch.name.toLowerCase() === channel && !ch.users.includes(sender)) {
              return { ...ch, users: [...ch.users, sender] };
            }
            return ch;
          })
        );

        if (sender === nick) {
          joinedChannelsRef.current.add(channel);
          setActiveTarget(channel);
        }
      }
    } else if (line.includes(' PART ')) {
      const match = line.match(/^:([^!]+)![^ ]+ PART ([^ ]+)(?: :(.*))?$/);
      if (match) {
        const [, sender, rawChannel, reason] = match;
        const channel = rawChannel.startsWith('#') ? rawChannel.toLowerCase() : '#' + rawChannel.toLowerCase();
        addMessage(channel, {
          id: Math.random().toString(),
          sender: 'System',
          target: channel,
          text: `* ${sender} has left ${channel}${reason ? ` (${reason})` : ''}`,
          timestamp: time,
          isAction: true,
        });

        // Remove user from channel user list
        setChannels((prev) =>
          prev.map((ch) => {
            if (ch.name.toLowerCase() === channel) {
              return { ...ch, users: ch.users.filter((u) => u !== sender && u !== '@' + sender && u !== '+' + sender) };
            }
            return ch;
          })
        );
      }
    } else if (line.includes(' QUIT ')) {
      const match = line.match(/^:([^!]+)![^ ]+ QUIT(?: :(.*))?$/);
      if (match) {
        const [, sender, reason] = match;
        // Remove user from all channels
        setChannels((prev) =>
          prev.map((ch) => ({
            ...ch,
            users: ch.users.filter((u) => u !== sender && u !== '@' + sender && u !== '+' + sender),
          }))
        );
        addMessage(activeTarget.toLowerCase(), {
          id: Math.random().toString(),
          sender: 'System',
          target: activeTarget.toLowerCase(),
          text: `* ${sender} has quit IRC${reason ? ` (${reason})` : ''}`,
          timestamp: time,
          isAction: true,
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
    } else if (line.includes(' KICK ')) {
      const match = line.match(/^:([^!]+)![^ ]+ KICK ([^ ]+) ([^ ]+)(?: :(.*))?$/);
      if (match) {
        const [, sender, rawChannel, targetNick, reason] = match;
        const channel = rawChannel.toLowerCase();
        addMessage(channel, {
          id: Math.random().toString(),
          sender: 'System',
          target: channel,
          text: `* ${targetNick} was kicked from ${channel} by ${sender}${reason ? ` (${reason})` : ''}`,
          timestamp: time,
          isAction: true,
        });
        setChannels((prev) =>
          prev.map((ch) => {
            if (ch.name.toLowerCase() === channel) {
              return { ...ch, users: ch.users.filter((u) => u.replace(/^[@+]/, '') !== targetNick) };
            }
            return ch;
          })
        );
        if (targetNick === nick) {
          joinedChannelsRef.current.delete(channel);
          addMessage(channel, {
            id: Math.random().toString(),
            sender: 'System',
            target: channel,
            text: `* You were kicked from ${channel}. Type /join ${channel} to re-join.`,
            timestamp: time,
            isSystem: true,
          });
        }
      }
    } else if (line.includes(' MODE ')) {
      const match = line.match(/^:([^!]+)![^ ]+ MODE ([^ ]+) (.*)$/);
      if (match) {
        const [, sender, rawChannel, modeText] = match;
        const channel = rawChannel.toLowerCase();
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
          text: `* ${sender} changed topic to: ${newTopic}`,
          timestamp: time,
          isSystem: true,
        });
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
        if (oldNick === nick) {
          setNick(newNick);
        }
        setChannels((prev) =>
          prev.map((ch) => ({
            ...ch,
            users: ch.users.map((u) => (u.replace(/^[@+]/, '') === oldNick ? u.charAt(0) + newNick : u)),
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
    } else if (line.includes(' 332 ')) {
      // RPL_TOPIC :server 332 nick #channel :topic text
      const match = line.match(/ 332 [^ ]+ ([^ ]+) :(.*)$/);
      if (match) {
        const [, rawChannel, topicText] = match;
        const channel = rawChannel.startsWith('#') ? rawChannel.toLowerCase() : '#' + rawChannel.toLowerCase();
        setChannels((prev) =>
          prev.map((ch) => (ch.name.toLowerCase() === channel ? { ...ch, topic: topicText } : ch))
        );
      }
    } else if (line.includes(' 366 ')) {
      // RPL_ENDOFNAMES :server 366 nick #channel :End of /NAMES list.
      return;
    } else {
      // Cleanly format system banners, WHOIS, LIST, and MOTD numerics
      const cleanedLine = line.replace(/^:[^ ]+ \d{3} [^ ]+ :?/, '').replace(/^:[^ ]+ NOTICE [^ ]+ :?/, '');
      if (cleanedLine.trim()) {
        addMessage('Status', {
          id: Math.random().toString(),
          sender: 'System',
          target: 'Status',
          text: cleanedLine,
          timestamp: time,
          isSystem: true,
        });
      }
    }
  };

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
      handleIncomingLine,
      (status) => {
        setIsConnected(status);
        if (status && wsRef.current) {
          // Perform automatic registration on connect
          wsRef.current.send(`NICK ${nick}`);
          wsRef.current.send(`USER ${nick} 0 * :Web Client User`);
          wsRef.current.send(`JOIN #enterprise`);
          wsRef.current.send(`JOIN #devops`);
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

  const handleSendMessage = (text: string) => {
    const time = new Date().toLocaleTimeString();

    if (text.startsWith('/')) {
      // Handle slash commands
      const parts = text.slice(1).split(' ');
      const cmd = parts[0].toUpperCase();
      const arg = parts.slice(1).join(' ');

      if (cmd === 'JOIN' && arg) {
        const channelName = (arg.startsWith('#') ? arg : '#' + arg).toLowerCase();
        if (!channels.some((c) => c.name.toLowerCase() === channelName)) {
          setChannels((prev) => [
            ...prev,
            { name: channelName, topic: 'Joined channel', unreadCount: 0, users: [nick] },
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
      } else if ((cmd === 'MSG' || cmd === 'PRIVMSG') && arg) {
        const firstSpace = arg.indexOf(' ');
        if (firstSpace > -1) {
          const msgTarget = arg.slice(0, firstSpace).toLowerCase();
          const msgText = arg.slice(firstSpace + 1);
          if (wsRef.current) wsRef.current.send(`PRIVMSG ${msgTarget} :${msgText}`);

          if (!msgTarget.startsWith('#')) {
            setChannels((prev) => {
              if (!prev.some((c) => c.name.toLowerCase() === msgTarget)) {
                return [...prev, { name: msgTarget, topic: 'Private Query', unreadCount: 0, users: [nick, msgTarget] }];
              }
              return prev;
            });
            setActiveTarget(msgTarget);
          }
          addMessage(msgTarget, {
            id: Math.random().toString(),
            sender: nick,
            target: msgTarget,
            text: msgText,
            timestamp: time,
          });
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
          const target = arg.slice(0, firstSpace);
          const noticeMsg = arg.slice(firstSpace + 1);
          if (wsRef.current) wsRef.current.send(`NOTICE ${target} :${noticeMsg}`);
          addMessage(target.startsWith('#') ? target.toLowerCase() : activeTarget, {
            id: Math.random().toString(),
            sender: `-${nick}-`,
            target,
            text: noticeMsg,
            timestamp: time,
            isSystem: true,
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
      }
      return;
    }

    // Normal PRIVMSG
    const normTarget = activeTarget.toLowerCase();
    if (normTarget.startsWith('#')) {
      if (!joinedChannelsRef.current.has(normTarget)) {
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
        />

        <ChatArea
          activeTarget={activeTarget}
          activeChannel={currentChannel}
          messages={currentMessages}
          isRtlLanguage={preferences.language === 'he'}
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
      />
    </div>
  );
};

export default App;
