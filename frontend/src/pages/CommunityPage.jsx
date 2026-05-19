import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { useTheme } from '../hooks/useTheme';

const POST_TYPES = [
  { id: 'all', label: 'All', badge: 'Community' },
  { id: 'announcement', label: 'Announcements', badge: 'Announcement' },
  { id: 'feedback', label: 'Feedback', badge: 'Feedback' },
  { id: 'bug', label: 'Bug Reports', badge: 'Bug' },
  { id: 'feature', label: 'Feature Requests', badge: 'Feature' },
  { id: 'discussion', label: 'Discussions', badge: 'Discussion' },
];

const STATUS_FILTERS = ['all', 'open', 'reviewing', 'resolved', 'closed'];
const TYPE_OPTIONS = POST_TYPES.filter((type) => type.id !== 'all');

const initialForm = { type: 'feedback', title: '', body: '' };

function titleCase(value) {
  return String(value || '').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getShareText() {
  return encodeURIComponent('Join the ChessPlay community and help shape new chess features.');
}

export default function CommunityPage({ user, onBack, onNavigate }) {
  const { theme } = useTheme();
  const [activeType, setActiveType] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [form, setForm] = useState(initialForm);

  const supporter = Boolean(user?.isSupporter || user?.isPremium || user?.adsDisabled);
  const filteredLabel = useMemo(() => POST_TYPES.find((type) => type.id === activeType)?.label || 'Community', [activeType]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setNotice({ type: '', message: '' });
    try {
      const params = new URLSearchParams({ limit: '40' });
      if (activeType !== 'all') params.set('type', activeType);
      if (activeStatus !== 'all') params.set('status', activeStatus);
      const data = await apiClient(`/api/social/community/posts?${params.toString()}`, { skipAuthRefresh: true });
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (error) {
      setPosts([]);
      setNotice({ type: 'error', message: error.message || 'Unable to reach server. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [activeType, activeStatus]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function createPost(event) {
    event.preventDefault();
    if (!user) {
      setNotice({ type: 'error', message: 'Please sign in to post feedback or join discussions.' });
      return;
    }
    const title = form.title.trim();
    const body = form.body.trim();
    if (title.length < 4) {
      setNotice({ type: 'error', message: 'Title must be at least 4 characters.' });
      return;
    }
    if (body.length < 10) {
      setNotice({ type: 'error', message: 'Message must be at least 10 characters.' });
      return;
    }
    setSubmitting(true);
    setNotice({ type: '', message: '' });
    try {
      const data = await apiClient('/api/social/community/posts', {
        method: 'POST',
        body: JSON.stringify({ ...form, title, body }),
      });
      setPosts((current) => [data.post, ...current]);
      setForm(initialForm);
      setNotice({ type: 'success', message: 'Post submitted successfully.' });
    } catch (error) {
      const message = error.status === 401 ? 'Please sign in to continue.' : error.message || 'Unable to submit post. Please try again.';
      setNotice({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  }

  async function likePost(postId) {
    if (!user) {
      setNotice({ type: 'error', message: 'Please sign in to like community posts.' });
      return;
    }
    try {
      const data = await apiClient(`/api/social/community/posts/${postId}/like`, { method: 'POST' });
      setPosts((current) => current.map((post) => post._id === postId ? data.post : post));
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Unable to update this post.' });
    }
  }

  async function addComment(postId, text) {
    if (!user) {
      setNotice({ type: 'error', message: 'Please sign in to comment.' });
      return;
    }
    const value = text.trim();
    if (value.length < 2) return;
    try {
      const data = await apiClient(`/api/social/community/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      });
      setPosts((current) => current.map((post) => post._id === postId ? data.post : post));
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Unable to add comment.' });
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6" style={{ color: theme.text.primary }}>
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#101f18] via-[#0f172a] to-[#070b12] p-5 shadow-2xl shadow-black/30 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <button type="button" onClick={onBack} className="mb-4 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/15">← Back</button>
            <div className="mb-3 inline-flex rounded-full border border-[#81b64c]/30 bg-[#81b64c]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#b7f38b]">Community</div>
            <h1 className="font-['Montserrat'] text-3xl font-black text-white md:text-5xl">ChessPlay Community</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">Connect with players, share feedback, report bugs, request features, and follow ChessPlay updates. Community reading is free; posting requires sign-in for safety.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
            <button type="button" onClick={() => onNavigate?.('premium')} className="rounded-2xl border border-[#81b64c]/30 bg-[#81b64c]/15 p-4 text-left hover:bg-[#81b64c]/20">
              <div className="text-sm font-black text-[#b7f38b]">Supporter growth</div>
              <div className="mt-1 text-sm text-slate-300">Support ChessPlay for badges, no ads, and priority feedback.</div>
            </button>
            <button type="button" onClick={() => onNavigate?.('tournaments')} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-left hover:bg-white/15">
              <div className="text-sm font-black text-white">Community events</div>
              <div className="mt-1 text-sm text-slate-300">Open tournaments and player events when available.</div>
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {['Announcements', 'Feedback & Ideas', 'Bug Reports', 'Guidelines'].map((item) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-black/10">
            <div className="text-sm font-black text-white">{item}</div>
            <p className="mt-2 text-sm text-slate-400">{item === 'Guidelines' ? 'Be respectful, helpful, and avoid sharing private details.' : 'Real community content only. No fake stats or seeded posts.'}</p>
          </div>
        ))}
      </section>

      {notice.message && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${notice.type === 'success' ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-amber-300/30 bg-amber-300/10 text-amber-100'}`}>
          {notice.message}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <form onSubmit={createPost} className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl space-y-4">
            <div>
              <h2 className="font-['Montserrat'] text-xl font-black text-white">Share with the community</h2>
              <p className="text-sm text-slate-400">Feedback, bugs, feature requests, and discussions are reviewed safely.</p>
            </div>
            {!user && (
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
                Sign in to post feedback or join discussions.
                <button type="button" onClick={() => onNavigate?.('login')} className="mt-3 block rounded-xl bg-white/10 px-4 py-2 font-black text-white hover:bg-white/15">Sign in</button>
              </div>
            )}
            {supporter && <div className="rounded-xl border border-[#81b64c]/30 bg-[#81b64c]/10 px-3 py-2 text-sm font-black text-[#b7f38b]">Supporter badge active</div>}
            <label className="block text-sm font-bold text-slate-200">Post type
              <select disabled={!user || submitting} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#07100d] px-4 py-3 text-white disabled:opacity-60">
                {TYPE_OPTIONS.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-200">Title
              <input disabled={!user || submitting} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="Short, clear title" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-slate-500 disabled:opacity-60" />
            </label>
            <label className="block text-sm font-bold text-slate-200">Message
              <textarea disabled={!user || submitting} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={1500} rows={6} placeholder="Explain your feedback, bug, feature idea, or discussion topic." className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-slate-500 disabled:opacity-60" />
            </label>
            <button disabled={!user || submitting} type="submit" className="w-full rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit post'}</button>
          </form>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <h3 className="font-['Montserrat'] text-lg font-black text-white">Community roadmap</h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Phase 1: Feedback and discussions</li>
              <li>Phase 2: Voting</li>
              <li>Phase 3: Real supporter wall</li>
              <li>Phase 4: Community tournaments</li>
            </ol>
            <button type="button" onClick={() => onNavigate?.('premium')} className="mt-4 rounded-xl border border-[#81b64c]/40 px-4 py-2 text-sm font-black text-[#b7f38b]">Sponsor a feature</button>
          </div>
        </aside>

        <main className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-['Montserrat'] text-2xl font-black text-white">{filteredLabel}</h2>
                <p className="text-sm text-slate-400">Public posts from real ChessPlay users.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Type
                  <select value={activeType} onChange={(e) => setActiveType(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#07100d] px-3 py-2 text-sm text-white">
                    {POST_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Status
                  <select value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#07100d] px-3 py-2 text-sm text-white">
                    {STATUS_FILTERS.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </div>

          {loading && <CommunitySkeleton />}
          {!loading && notice.type === 'error' && posts.length === 0 && (
            <div className="rounded-3xl border border-rose-300/20 bg-rose-300/10 p-8 text-center text-rose-100">
              <p>{notice.message}</p>
              <button type="button" onClick={loadPosts} className="mt-4 rounded-xl bg-white/10 px-4 py-2 font-black text-white">Retry</button>
            </div>
          )}
          {!loading && posts.length === 0 && notice.type !== 'error' && (
            <div className="rounded-3xl border border-white/10 bg-white/10 p-8 text-center text-slate-300">
              <h3 className="font-['Montserrat'] text-xl font-black text-white">No community posts yet.</h3>
              <p className="mt-2">Start a discussion, share feedback, or report a bug when you are signed in.</p>
            </div>
          )}
          {posts.map((post) => <CommunityPostCard key={post._id} post={post} onLike={likePost} onComment={addComment} user={user} />)}
        </main>
      </section>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/10" />)}
    </div>
  );
}

function CommunityPostCard({ post, onLike, onComment, user }) {
  const [comment, setComment] = useState('');
  const shareUrl = encodeURIComponent(`${window.location.origin}/community`);
  return (
    <article className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#81b64c]/30 bg-[#81b64c]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#b7f38b]">{post.type}</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-200">{post.status}</span>
            {post.authorSupporter && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">Supporter</span>}
          </div>
          <h3 className="font-['Montserrat'] text-2xl font-black text-white">{post.title}</h3>
          <p className="mt-1 text-sm text-slate-400">By {post.authorName || 'ChessPlay player'} · {new Date(post.createdAt).toLocaleString()}</p>
        </div>
        <button type="button" onClick={() => onLike(post._id)} className={`rounded-xl px-4 py-2 font-black ${post.liked ? 'bg-[#81b64c] text-[#07100a]' : 'border border-white/10 bg-black/20 text-slate-200'}`}>♥ {post.likesCount || 0}</button>
      </div>
      <p className="mt-4 whitespace-pre-line leading-7 text-slate-200">{post.body || post.content}</p>
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <a className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-slate-200 hover:bg-white/15" href={`https://twitter.com/intent/tweet?text=${getShareText()}&url=${shareUrl}`} target="_blank" rel="noreferrer">Share on X</a>
        <a className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-bold text-slate-200 hover:bg-white/15" href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noreferrer">LinkedIn</a>
      </div>
      <div className="mt-5 space-y-2">
        {(post.comments || []).map((item) => (
          <div key={item._id || item.createdAt} className="rounded-lg bg-black/20 px-3 py-2 text-sm text-slate-300"><b className="text-white">{item.username}:</b> {item.text}</div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onComment(post._id, comment); setComment(''); }} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input disabled={!user} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={user ? 'Add a comment...' : 'Sign in to comment'} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-slate-500 disabled:opacity-60" />
        <button disabled={!user || comment.trim().length < 2} className="rounded-xl bg-white/10 px-4 py-3 font-bold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60">Send</button>
      </form>
    </article>
  );
}
