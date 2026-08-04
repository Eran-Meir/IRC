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

  const handleIncomingLine = (line: string) => {
    const time = new Date().toLocaleTimeString();

    // Parse incoming RFC 1459 lines
    if (line.includes(' PRIVMSG ')) {
      const match = line.match(/^:([^!]+)![^ ]+ PRIVMSG ([^ ]+) :(.*)$/);
      if (match) {
        const [, sender, target, text] = match;
        const msgTarget = target.startsWith('#') ? target : 'Status';
        addMessage(msgTarget, {
          id: Math.random().toString(),
          sender,
          target: msgTarget,
          text,
          timestamp: time,
        });
      }
    } else if (line.includes(' JOIN ')) {
      const match = line.match(/^:([^!]+)![^ ]+ JOIN :?([^ ]+)$/);
      if (match) {
        const [, sender, rawChannel] = match;
        const channel = rawChannel.startsWith('#') ? rawChannel : '#' + rawChannel;
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
            if (ch.name === channel && !ch.users.includes(sender)) {
              return { ...ch, users: [...ch.users, sender] };
            }
            return ch;
          })
        );
      }
    } else if (line.includes(' PART ')) {
      const match = line.match(/^:([^!]+)![^ ]+ PART ([^ ]+)(?: :(.*))?$/);
      if (match) {
        const [, sender, rawChannel, reason] = match;
        const channel = rawChannel.startsWith('#') ? rawChannel : '#' + rawChannel;
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
            if (ch.name === channel) {
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
        addMessage(activeTarget, {
          id: Math.random().toString(),
          sender: 'System',
          target: activeTarget,
          text: `* ${sender} has quit IRC${reason ? ` (${reason})` : ''}`,
          timestamp: time,
          isAction: true,
        });
      }
    } else if (line.includes(' 353 ')) {
      // RPL_NAMREPLY :server 353 nick = #channel :nick1 nick2
      const match = line.match(/ 353 [^ ]+ [=@*] ([^ ]+) :(.*)$/);
      if (match) {
        const [, rawChannel, userListStr] = match;
        const channel = rawChannel.startsWith('#') ? rawChannel : '#' + rawChannel;
        const nicks = userListStr.trim().split(/\s+/).filter(Boolean);

        setChannels((prev) =>
          prev.map((ch) => {
            if (ch.name === channel) {
              return { ...ch, users: nicks };
            }
            return ch;
          })
        );
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
            users: ch.users.map((u) => (u === oldNick ? newNick : u)),
          }))
        );
        addMessage(activeTarget, {
          id: Math.random().toString(),
          sender: 'System',
          target: activeTarget,
          text: `* ${oldNick} is now known as ${newNick}`,
          timestamp: time,
          isSystem: true,
        });
      }
    } else {
      // System Notice / Banner
      addMessage('Status', {
        id: Math.random().toString(),
        sender: 'System',
        target: 'Status',
        text: line,
        timestamp: time,
        isSystem: true,
      });
    }
  };

  const addMessage = (target: string, msg: Message) => {
    setMessages((prev) => ({
      ...prev,
      [target]: [...(prev[target] || []), msg],
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
        const channelName = arg.startsWith('#') ? arg : '#' + arg;
        if (wsRef.current) wsRef.current.send(`JOIN ${channelName}`);
        if (!channels.find((c) => c.name === channelName)) {
          setChannels((prev) => [
            ...prev,
            { name: channelName, topic: 'Joined channel', unreadCount: 0, users: [nick] },
          ]);
        }
        setActiveTarget(channelName);
      } else if (cmd === 'NICK' && arg) {
        if (wsRef.current) wsRef.current.send(`NICK ${arg}`);
        setNick(arg);
      } else if (cmd === 'PART') {
        const channelName = arg || activeTarget;
        if (wsRef.current) wsRef.current.send(`PART ${channelName}`);
        handlePartChannel(channelName);
      }
      return;
    }

    // Normal PRIVMSG
    if (activeTarget.startsWith('#') && wsRef.current) {
      wsRef.current.send(`PRIVMSG ${activeTarget} :${text}`);
    }
  };

  const handlePartChannel = (channelName: string) => {
    setChannels((prev) => prev.filter((c) => c.name !== channelName));
    if (activeTarget === channelName) {
      setActiveTarget('#enterprise');
    }
  };

  const currentChannel = channels.find((c) => c.name === activeTarget);
  const currentMessages = messages[activeTarget] || [];

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
          channels={channels}
          activeTarget={activeTarget}
          onSelectTarget={setActiveTarget}
          onPartChannel={handlePartChannel}
        />

        <ChatArea
          activeTarget={activeTarget}
          activeChannel={currentChannel}
          messages={currentMessages}
          isRtlLanguage={preferences.language === 'he'}
        />

        {preferences.showUserList && currentChannel && (
          <UserList users={currentChannel.users} />
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
