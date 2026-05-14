import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL, SOCKET_URL } from '../config/runtime';
import { apiClient } from '../services/apiClient';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../hooks/useTheme';

async function getSocketToken() {
  const response = await fetch(`${BACKEND_URL}/api/auth/socket-token`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Socket token unavailable');
  return data.socketToken;
}

export default function MessagesPage({ onBack, onNavigate }) {
  const { theme } = useTheme();
  const { user } = useCurrentUser();
  const socketRef = useRef(null);
  const [bootstrap, setBootstrap] = useState({ publicRooms: [], friends: [] });
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typing, setTyping] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const typingTimer = useRef(null);
  const bottomRef = useRef(null);

  const activeTitle = useMemo(() => activeConversation?.title || 'Select a room or friend', [activeConversation]);

  const loadBootstrap = useCallback(async () => {
    try {
      const data = await apiClient('/api/social/messaging/bootstrap');
      setBootstrap(data);
      const list = await apiClient('/api/social/messaging/conversations');
      setConversations(list.conversations || []);
    } catch (error) {
      setNotice(error.message || 'Failed to load messages.');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadBootstrap, 0);
    return () => window.clearTimeout(timer);
  }, [loadBootstrap]);

  useEffect(() => {
    let alive = true;
    async function connect() {
      try {
        const token = await getSocketToken();
        if (!alive) return;
        const socket = io(SOCKET_URL || BACKEND_URL, {
          transports: ['websocket', 'polling'],
          withCredentials: true,
          auth: token ? { accessToken: token } : undefined,
          reconnection: true,
          reconnectionAttempts: 8,
        });
        socketRef.current = socket;
        socket.on('connect', () => setConnectionStatus('online'));
        socket.on('disconnect', () => setConnectionStatus('offline'));
        socket.on('connect_error', () => setConnectionStatus('retrying'));
        socket.on('socialUserStatus', ({ userId, status }) => setOnlineUsers((current) => ({ ...current, [userId]: status })));
        socket.on('socialTyping', (data) => {
          if (data.conversationId === activeConversation?._id && data.userId !== (user?._id || user?.id)) {
            setTyping(data.isTyping ? `${data.username} is typing...` : null);
          }
        });
        socket.on('socialMessage', (data) => {
          if (data.conversationId === activeConversation?._id) {
            setMessages((current) => [...current, data.message]);
          }
          loadBootstrap();
        });
      } catch {
        setConnectionStatus('offline');
      }
    }
    connect();
    return () => { alive = false; socketRef.current?.disconnect(); };
  }, [activeConversation?._id, user?._id, user?.id, loadBootstrap]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function openPublicRoom(roomKey) {
    try {
      const data = await apiClient('/api/social/messaging/open', {
        method: 'POST',
        body: JSON.stringify({ type: 'public', roomKey }),
      });
      await openConversation(data.conversation);
      loadBootstrap();
    } catch (error) {
      setNotice(error.message || 'Could not open room.');
    }
  }

  async function openFriend(friendId) {
    try {
      const data = await apiClient('/api/social/messaging/open', {
        method: 'POST',
        body: JSON.stringify({ type: 'private', friendId }),
      });
      await openConversation(data.conversation);
      loadBootstrap();
    } catch (error) {
      setNotice(error.message || 'Could not open friend chat. Add friends first from profile/leaderboard.');
    }
  }

  async function openConversation(conversation) {
    if (activeConversation?._id) socketRef.current?.emit('leaveConversation', { conversationId: activeConversation._id });
    setActiveConversation(conversation);
    socketRef.current?.emit('joinConversation', { conversationId: conversation._id });
    const data = await apiClient(`/api/social/messaging/conversations/${conversation._id}/messages`);
    setMessages(data.messages || []);
  }

  function emitTyping(value) {
    setText(value);
    if (!activeConversation?._id) return;
    socketRef.current?.emit('socialTyping', { conversationId: activeConversation._id, isTyping: true });
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      socketRef.current?.emit('socialTyping', { conversationId: activeConversation._id, isTyping: false });
    }, 900);
  }

  async function sendMessage(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value || !activeConversation?._id) return;
    setText('');
    if (socketRef.current?.connected) {
      socketRef.current.emit('socialMessage', { conversationId: activeConversation._id, text: value });
      return;
    }
    try {
      const data = await apiClient(`/api/social/messaging/conversations/${activeConversation._id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      });
      setMessages((current) => [...current, data.message]);
    } catch (error) {
      setNotice(error.message || 'Message failed.');
    }
  }

  async function moderate(action) {
    if (!activeConversation?._id) return;
    try {
      const reason = action === 'report' ? window.prompt('Why are you reporting this conversation?') || 'Reported from ChessPlay' : undefined;
      await apiClient(`/api/social/messaging/conversations/${activeConversation._id}/moderation`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
      setNotice(action === 'report' ? 'Report submitted.' : `${action} toggled.`);
    } catch (error) {
      setNotice(error.message || 'Action failed.');
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8" style={{ color: theme.text.primary }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="mb-3 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/15">← Back</button>
          <h1 className="font-['Montserrat'] text-3xl md:text-5xl font-black text-white">Messages</h1>
          <p className="mt-2 text-slate-300">Private friend chat and public community rooms with mute, block, report, typing and online status.</p>
        </div>
        <button type="button" onClick={() => onNavigate?.('community')} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a]">Community</button>
      </div>

      {notice && <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">{notice}</div>}

      <section className="grid min-h-[650px] overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-black/20 p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-['Montserrat'] text-xl font-black text-white">Inbox</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${connectionStatus === 'online' ? 'bg-green-400/15 text-green-200' : 'bg-amber-400/15 text-amber-100'}`}>{connectionStatus}</span>
          </div>
          <div className="space-y-5 overflow-y-auto pr-1">
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Public Rooms</div>
              <div className="space-y-2">
                {(bootstrap.publicRooms || []).map((room) => (
                  <button key={room.key} type="button" onClick={() => openPublicRoom(room.key)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                    <div className="font-bold text-white"># {room.title}</div>
                    <div className="text-xs text-slate-400">{room.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Friend Chat</div>
              <div className="space-y-2">
                {(bootstrap.friends || []).map((friend) => (
                  <button key={friend._id} type="button" onClick={() => openFriend(friend._id)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                    <span className={`h-2.5 w-2.5 rounded-full ${onlineUsers[friend._id] === 'online' && friend.onlineVisible ? 'bg-green-400' : 'bg-slate-500'}`} />
                    <span><span className="block font-bold text-white">{friend.username}</span><span className="text-xs text-slate-400">{friend.rating || 1200} ELO</span></span>
                  </button>
                ))}
                {(bootstrap.friends || []).length === 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No friends yet. Use public rooms for now.</div>}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Recent</div>
              {(conversations || []).slice(0, 8).map((conversation) => (
                <button key={conversation._id} type="button" onClick={() => openConversation(conversation)} className="mb-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-left text-sm text-slate-200 hover:bg-white/10">{conversation.type === 'public' ? '# ' : '🔒 '}{conversation.title || conversation.roomKey}</button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex min-h-[650px] flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div><h2 className="font-['Montserrat'] text-xl font-black text-white">{activeTitle}</h2>{typing && <p className="text-sm text-[#81b64c]">{typing}</p>}</div>
            <div className="flex gap-2">
              <button onClick={() => moderate('mute')} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-slate-200">Mute</button>
              <button onClick={() => moderate('block')} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-slate-200">Block</button>
              <button onClick={() => moderate('report')} className="rounded-lg border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-100">Report</button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {!activeConversation && <div className="grid h-full place-items-center text-center text-slate-400"><div><div className="text-5xl">💬</div><p className="mt-3">Choose a public room or friend to start chatting.</p></div></div>}
            {messages.map((message) => {
              const mine = String(message.sender) === String(user?._id || user?.id);
              return <div key={message._id || message.createdAt} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? 'bg-[#81b64c] text-[#07100a]' : 'bg-black/25 text-slate-100'}`}><div className="mb-1 text-xs font-black opacity-70">{message.senderName}</div><div>{message.text}</div></div></div>;
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-4">
            <input disabled={!activeConversation} value={text} onChange={(e) => emitTyping(e.target.value)} placeholder={activeConversation ? 'Type your message...' : 'Select a conversation first'} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-slate-500 disabled:opacity-50" />
            <button disabled={!activeConversation || !text.trim()} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a] disabled:opacity-50">Send</button>
          </form>
        </main>
      </section>
    </div>
  );
}
