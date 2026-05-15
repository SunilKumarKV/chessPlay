import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { useTheme } from '../hooks/useTheme';

const POST_TYPES = [
  { id: 'post', label: 'Posts', icon: '💬' },
  { id: 'puzzle', label: 'Puzzles', icon: '🧩' },
  { id: 'discussion', label: 'Discussions', icon: '♟️' },
  { id: 'achievement', label: 'Achievements', icon: '🏅' },
  { id: 'tournament', label: 'Tournaments', icon: '🏆' },
];

export default function CommunityPage({ onBack, onNavigate }) {
  const { theme } = useTheme();
  const [activeType, setActiveType] = useState('post');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ type: 'post', title: '', content: '', puzzleFen: '', puzzleSolution: '' });
  const activeLabel = useMemo(() => POST_TYPES.find((type) => type.id === activeType)?.label || 'Community', [activeType]);

  const loadPosts = useCallback(async (type = activeType) => {
    setLoading(true);
    setNotice('');
    try {
      const data = await apiClient(`/api/social/community/posts?type=${encodeURIComponent(type)}&limit=40`);
      setPosts(data.posts || []);
    } catch (error) {
      setNotice(error.message || 'Failed to load community posts.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadPosts(activeType), 0);
    return () => window.clearTimeout(timer);
  }, [activeType, loadPosts]);

  async function createPost(event) {
    event.preventDefault();
    setNotice('');
    try {
      const payload = { ...form, type: form.type || activeType };
      const data = await apiClient('/api/social/community/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setPosts((current) => [data.post, ...current]);
      setForm({ type: activeType, title: '', content: '', puzzleFen: '', puzzleSolution: '' });
      setNotice('Posted successfully.');
    } catch (error) {
      setNotice(error.message || 'Could not create post.');
    }
  }

  async function likePost(postId) {
    try {
      const data = await apiClient(`/api/social/community/posts/${postId}/like`, { method: 'POST' });
      setPosts((current) => current.map((post) => post._id === postId ? data.post : post));
    } catch (error) {
      setNotice(error.message || 'Could not update like.');
    }
  }

  async function addComment(postId, text) {
    const value = text.trim();
    if (!value) return;
    try {
      const data = await apiClient(`/api/social/community/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      });
      setPosts((current) => current.map((post) => post._id === postId ? data.post : post));
    } catch (error) {
      setNotice(error.message || 'Could not add comment.');
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6" style={{ color: theme.text.primary }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="mb-3 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/15">← Back</button>
          <h1 className="font-['Montserrat'] text-3xl md:text-5xl font-black text-white">ChessPlay Community</h1>
          <p className="mt-2 max-w-2xl text-slate-300">Posts, chess puzzles, discussions, achievements, and tournament updates in one safe community page.</p>
        </div>
        <button type="button" onClick={() => onNavigate?.('messages')} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a] shadow-lg shadow-[#81b64c]/20">Open Messages</button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {POST_TYPES.map((type) => (
          <button key={type.id} type="button" onClick={() => { setActiveType(type.id); setForm((f) => ({ ...f, type: type.id })); }} className={`rounded-xl border px-4 py-3 text-left font-bold transition ${activeType === type.id ? 'border-[#81b64c] bg-[#81b64c] text-[#07100a]' : 'border-white/10 bg-white/10 text-slate-200 hover:bg-white/15'}`}>
            <div className="text-2xl">{type.icon}</div>
            <div>{type.label}</div>
          </button>
        ))}
      </div>

      {notice && <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">{notice}</div>}

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={createPost} className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl space-y-4">
          <div>
            <h2 className="font-['Montserrat'] text-xl font-black text-white">Create Community Update</h2>
            <p className="text-sm text-slate-400">Share something useful. HTML is stripped for safety.</p>
          </div>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-white/10 bg-[#07100d] px-4 py-3 text-white">
            {POST_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="Title" className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-slate-500" />
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} maxLength={1500} rows={6} placeholder="Write your post, puzzle idea, discussion, achievement, or tournament update..." className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-slate-500" />
          {form.type === 'puzzle' && (
            <div className="grid gap-3">
              <input value={form.puzzleFen} onChange={(e) => setForm({ ...form, puzzleFen: e.target.value })} placeholder="Optional FEN" className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-slate-500" />
              <input value={form.puzzleSolution} onChange={(e) => setForm({ ...form, puzzleSolution: e.target.value })} placeholder="Optional solution" className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-slate-500" />
            </div>
          )}
          <button type="submit" className="w-full rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a]">Publish</button>
        </form>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-xl font-black text-white">{activeLabel}</h2>
            <p className="text-sm text-slate-400">Latest community activity.</p>
          </div>
          {loading && <div className="rounded-xl border border-white/10 bg-white/10 p-8 text-center text-slate-300">Loading community...</div>}
          {!loading && posts.length === 0 && <div className="rounded-xl border border-white/10 bg-white/10 p-8 text-center text-slate-300">No posts yet. Be the first to post.</div>}
          {posts.map((post) => <CommunityPostCard key={post._id} post={post} onLike={likePost} onComment={addComment} />)}
        </div>
      </section>
    </div>
  );
}

function CommunityPostCard({ post, onLike, onComment }) {
  const [comment, setComment] = useState('');
  return (
    <article className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#81b64c]">{post.type}</div>
          <h3 className="font-['Montserrat'] text-2xl font-black text-white">{post.title}</h3>
          <p className="mt-1 text-sm text-slate-400">By {post.authorName} · {new Date(post.createdAt).toLocaleString()}</p>
        </div>
        <button type="button" onClick={() => onLike(post._id)} className={`rounded-xl px-4 py-2 font-black ${post.liked ? 'bg-[#81b64c] text-[#07100a]' : 'border border-white/10 bg-black/20 text-slate-200'}`}>♥ {post.likesCount}</button>
      </div>
      <p className="mt-4 whitespace-pre-line leading-7 text-slate-200">{post.content}</p>
      {post.puzzleFen && <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">FEN: {post.puzzleFen}</div>}
      <div className="mt-5 space-y-2">
        {(post.comments || []).map((item) => (
          <div key={item._id || item.createdAt} className="rounded-lg bg-black/20 px-3 py-2 text-sm text-slate-300"><b className="text-white">{item.username}:</b> {item.text}</div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onComment(post._id, comment); setComment(''); }} className="mt-4 flex gap-2">
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-slate-500" />
        <button className="rounded-xl bg-white/10 px-4 py-3 font-bold text-white hover:bg-white/15">Send</button>
      </form>
    </article>
  );
}
