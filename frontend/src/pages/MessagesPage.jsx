import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../hooks/useTheme';

const POLL_INTERVAL_MS = 8000;
const MAX_MESSAGE_LENGTH = 1000;

function formatTime(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function getInitials(name = 'CP') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CP';
}

function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;
  const classes = type === 'error'
    ? 'border-red-400/30 bg-red-500/10 text-red-100'
    : type === 'success'
      ? 'border-green-400/30 bg-green-500/10 text-green-100'
      : 'border-amber-300/30 bg-amber-300/10 text-amber-100';
  return (
    <div className={`mb-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${classes}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xs font-black hover:bg-white/10" aria-label="Dismiss message">✕</button>
    </div>
  );
}

function StatusBadge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-400/10 text-slate-200 border-slate-300/20',
    green: 'bg-green-400/10 text-green-200 border-green-300/20',
    purple: 'bg-purple-400/10 text-purple-200 border-purple-300/20',
    amber: 'bg-amber-400/10 text-amber-100 border-amber-300/20',
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${tones[tone] || tones.slate}`}>{children}</span>;
}

function EmptyState({ title, copy, action }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl">✉️</div>
      <h3 className="font-['Montserrat'] text-xl font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300">{copy}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading messages">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="mb-3 h-4 w-2/3 rounded bg-white/10" />
          <div className="h-3 w-1/2 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export default function MessagesPage({ onBack, onNavigate }) {
  const { theme } = useTheme();
  const { user, loading: authLoading } = useCurrentUser();
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const toastTimerRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showConversationList, setShowConversationList] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const currentUserId = String(user?._id || user?.id || '');
  const isAuthenticated = Boolean(user && !user.isGuest);
  const activeTitle = useMemo(() => activeConversation?.title || 'Select a conversation', [activeConversation]);
  const activeOtherUser = activeConversation?.otherParticipants?.[0];
  const totalUnread = conversations.reduce((sum, conversation) => sum + Number(conversation.unreadCount || 0), 0);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast({ message: '', type: 'info' }), 4500);
  }, []);

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    if (!isAuthenticated) {
      setConversations([]);
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    setError('');
    try {
      const data = await apiClient('/api/messages/conversations');
      setConversations(data.conversations || []);
    } catch (err) {
      const message = err.status === 401
        ? 'Please sign in to view messages.'
        : err.message || 'Unable to load conversations. Please try again.';
      setError(message);
      if (!silent) showToast(message, 'error');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [isAuthenticated, showToast]);

  const loadMessages = useCallback(async (conversationId, { silent = false } = {}) => {
    if (!conversationId || !isAuthenticated) return;
    if (!silent) setIsMessagesLoading(true);
    try {
      const data = await apiClient(`/api/messages/conversations/${conversationId}/messages`);
      setMessages(data.messages || []);
      setActiveConversation(data.conversation || activeConversation);
      await apiClient(`/api/messages/conversations/${conversationId}/read`, { method: 'PATCH' }).catch(() => {});
      loadConversations({ silent: true });
    } catch (err) {
      const message = err.status === 403
        ? 'You do not have access to this conversation.'
        : err.status === 404
          ? 'Conversation not found.'
          : err.message || 'Unable to load messages. Please try again.';
      showToast(message, 'error');
    } finally {
      if (!silent) setIsMessagesLoading(false);
    }
  }, [activeConversation, isAuthenticated, loadConversations, showToast]);

  useEffect(() => {
    if (authLoading) return;
    loadConversations();
  }, [authLoading, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    window.clearInterval(pollRef.current);
    if (!activeConversation?._id || !isAuthenticated) return undefined;
    pollRef.current = window.setInterval(() => {
      loadMessages(activeConversation._id, { silent: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(pollRef.current);
  }, [activeConversation?._id, isAuthenticated, loadMessages]);

  useEffect(() => {
    const query = searchText.trim();
    const controller = new AbortController();
    if (!isAuthenticated || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return () => controller.abort();
    }

    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await apiClient(`/api/messages/users/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        setSearchResults(data.users || []);
      } catch (err) {
        if (err.name !== 'AbortError') setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isAuthenticated, searchText]);

  async function openConversation(conversation) {
    setActiveConversation(conversation);
    setShowConversationList(false);
    await loadMessages(conversation._id);
  }

  async function startConversation(participantId) {
    try {
      const data = await apiClient('/api/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({ participantId }),
      });
      setSearchText('');
      setSearchResults([]);
      showToast('Conversation ready.', 'success');
      await loadConversations({ silent: true });
      await openConversation(data.conversation);
    } catch (err) {
      showToast(err.message || 'Unable to start conversation. Please try again.', 'error');
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (isSending || !activeConversation?._id) return;
    const body = messageText.trim();
    if (!body) {
      showToast('Message cannot be empty.', 'error');
      return;
    }
    if (body.length > MAX_MESSAGE_LENGTH) {
      showToast(`Message must be ${MAX_MESSAGE_LENGTH} characters or less.`, 'error');
      return;
    }

    setIsSending(true);
    setMessageText('');
    try {
      const data = await apiClient(`/api/messages/conversations/${activeConversation._id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      setMessages((current) => [...current, data.message]);
      setActiveConversation(data.conversation || activeConversation);
      await loadConversations({ silent: true });
    } catch (err) {
      setMessageText(body);
      showToast(err.message || 'Unable to send message. Please try again.', 'error');
    } finally {
      setIsSending(false);
    }
  }

  function handleMessageKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(event);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 md:p-8" style={{ color: theme.text.primary }}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-4xl p-4 md:p-8" style={{ color: theme.text.primary }}>
        <button type="button" onClick={onBack} className="mb-4 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/15">← Back</button>
        <EmptyState
          title="Sign in to view messages"
          copy="Messages are private. Sign in to chat with ChessPlay friends and manage conversations securely."
          action={(
            <button type="button" onClick={() => onNavigate?.('login')} className="rounded-2xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a] hover:bg-[#9bd35f]">
              Sign in
            </button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8" style={{ color: theme.text.primary }}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" onClick={onBack} className="mb-3 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/15">← Back</button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-['Montserrat'] text-3xl font-black text-white md:text-5xl">Messages</h1>
            {totalUnread > 0 ? <StatusBadge tone="amber">{totalUnread} unread</StatusBadge> : <StatusBadge tone="green">Private</StatusBadge>}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Chat with ChessPlay friends, keep conversations private, and see supporter badges in community messages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate?.('community')} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15">Community</button>
          <button type="button" onClick={() => onNavigate?.('monetization')} className="rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-3 text-sm font-black text-black hover:brightness-110">Support ChessPlay</button>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">
          <div className="font-black">Unable to load messages</div>
          <p className="mt-1 text-sm text-red-100/80">{error}</p>
          <button type="button" onClick={() => loadConversations()} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/15">Retry</button>
        </div>
      ) : null}

      <section className="grid min-h-[680px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/20 backdrop-blur-xl lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={`${showConversationList ? 'block' : 'hidden'} border-b border-white/10 bg-black/20 p-4 lg:block lg:border-b-0 lg:border-r`} aria-label="Conversation list">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-['Montserrat'] text-xl font-black text-white">Inbox</h2>
            <StatusBadge tone="purple">REST + polling</StatusBadge>
          </div>

          <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400" htmlFor="message-search">Start conversation</label>
          <input
            id="message-search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="mb-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#81b64c]"
            placeholder="Search username or email"
            autoComplete="off"
          />
          <div className="mb-5 space-y-2">
            {isSearching ? <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">Searching players...</div> : null}
            {!isSearching && searchText.trim().length >= 2 && searchResults.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-400">No players matched your search.</div>
            ) : null}
            {searchResults.map((result) => (
              <button
                type="button"
                key={result._id}
                onClick={() => startConversation(result._id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-[#81b64c]/60 hover:bg-white/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#81b64c]/20 text-sm font-black text-[#b8f076]">{getInitials(result.username)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black text-white">{result.username}</span>
                  <span className="text-xs text-slate-400">Rating {result.rating || 1200}</span>
                </span>
                {result.isSupporter ? <StatusBadge tone="amber">Supporter</StatusBadge> : null}
              </button>
            ))}
          </div>

          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Conversations</div>
            <button type="button" onClick={() => loadConversations()} className="rounded-lg px-2 py-1 text-xs font-black text-slate-300 hover:bg-white/10">Refresh</button>
          </div>

          {isLoading ? <LoadingSkeleton /> : null}
          {!isLoading && conversations.length === 0 ? (
            <EmptyState title="No messages yet" copy="Search for a player to start your first private conversation." />
          ) : null}

          <div className="space-y-2">
            {conversations.map((conversation) => {
              const isActive = activeConversation?._id === conversation._id;
              const other = conversation.otherParticipants?.[0];
              return (
                <button
                  key={conversation._id}
                  type="button"
                  onClick={() => openConversation(conversation)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${isActive ? 'border-[#81b64c]/70 bg-[#81b64c]/15' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white">{getInitials(other?.username || conversation.title)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-black text-white">{conversation.title}</span>
                        {conversation.unreadCount > 0 ? <span className="rounded-full bg-[#81b64c] px-2 py-0.5 text-[10px] font-black text-[#07100a]">{conversation.unreadCount}</span> : null}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-400">{conversation.lastMessage?.body || 'No messages yet.'}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">{formatTime(conversation.lastMessageAt)}</span>
                    </span>
                    {other?.isSupporter ? <span title="Supporter">⭐</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className={`${showConversationList ? 'hidden' : 'flex'} min-h-[680px] flex-col bg-black/10 lg:flex`} aria-label="Chat panel">
          {activeConversation ? (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={() => setShowConversationList(true)} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white lg:hidden" aria-label="Back to conversations">←</button>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#81b64c]/20 font-black text-[#b8f076]">{getInitials(activeOtherUser?.username || activeTitle)}</span>
                  <div className="min-w-0">
                    <h2 className="truncate font-['Montserrat'] text-xl font-black text-white">{activeTitle}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{activeOtherUser ? `Rating ${activeOtherUser.rating || 1200}` : 'Private conversation'}</span>
                      {activeOtherUser?.isSupporter ? <StatusBadge tone="amber">Supporter</StatusBadge> : null}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => loadMessages(activeConversation._id)} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white hover:bg-white/15">Refresh</button>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-6">
                {isMessagesLoading ? <LoadingSkeleton /> : null}
                {!isMessagesLoading && messages.length === 0 ? (
                  <EmptyState title="No messages yet" copy="Send a friendly chess message to begin this conversation." />
                ) : null}
                {messages.map((message) => {
                  const isOwn = message.isOwn || String(message.senderId) === currentUserId;
                  return (
                    <div key={message._id || `${message.createdAt}-${message.body}`} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-3xl px-4 py-3 shadow-lg md:max-w-[68%] ${isOwn ? 'bg-[#81b64c] text-[#07100a]' : 'border border-white/10 bg-white/10 text-white'}`}>
                        {!isOwn ? <div className="mb-1 text-xs font-black text-slate-300">{message.senderName}</div> : null}
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                        <div className={`mt-2 text-right text-[10px] font-bold ${isOwn ? 'text-[#07100a]/65' : 'text-slate-500'}`}>{formatTime(message.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendMessage} className="border-t border-white/10 bg-black/20 p-4">
                <label htmlFor="message-body" className="sr-only">Message body</label>
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <textarea
                    id="message-body"
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    onKeyDown={handleMessageKeyDown}
                    rows={2}
                    className="min-h-[54px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-[#81b64c]"
                    placeholder="Write a message..."
                    aria-describedby="message-help"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !messageText.trim()}
                    className="rounded-2xl bg-[#81b64c] px-6 py-3 font-black text-[#07100a] transition hover:bg-[#9bd35f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
                <div id="message-help" className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                  <span>Press Enter to send. Use Shift+Enter for a new line.</span>
                  <span>{messageText.length}/{MAX_MESSAGE_LENGTH}</span>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-4 md:p-8">
              <EmptyState
                title="Select a conversation"
                copy="Choose a chat from the inbox or search for a player to start a private conversation. Basic messaging stays free for all ChessPlay users."
                action={(
                  <button type="button" onClick={() => setShowConversationList(true)} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-black text-white hover:bg-white/15 lg:hidden">
                    Open inbox
                  </button>
                )}
              />
            </div>
          )}
        </main>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <StatusBadge tone="green">Free</StatusBadge>
          <h3 className="mt-3 font-['Montserrat'] text-lg font-black text-white">Basic chat stays free</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Message ChessPlay users without premium paywalls. Future themes and community extras may arrive for supporters.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <StatusBadge tone="amber">Supporter</StatusBadge>
          <h3 className="mt-3 font-['Montserrat'] text-lg font-black text-white">Supporter badges in chat</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">Approved supporters can show a badge in conversations and help fund safer community features.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <StatusBadge tone="purple">Roadmap</StatusBadge>
          <h3 className="mt-3 font-['Montserrat'] text-lg font-black text-white">Real-time chat later</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">This version uses stable REST polling so multiplayer sockets remain untouched. Typing indicators and live read receipts can come later.</p>
        </div>
      </section>
    </div>
  );
}
