const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { getRequestAccessToken, getJwtSecret } = require('../utils/security');
const { prisma } = require('../src/config/prisma');

const router = express.Router();

const POST_TYPES = new Set(['announcement', 'feedback', 'bug', 'feature', 'discussion']);
const POST_STATUSES = new Set(['open', 'reviewing', 'resolved', 'closed']);
const PUBLIC_ROOMS = [
  { key: 'general', title: 'General Chess Chat', description: 'Public lounge for ChessPlay users.' },
  { key: 'puzzles', title: 'Puzzle Room', description: 'Discuss tactics and daily puzzle ideas.' },
  { key: 'tournaments', title: 'Tournament Room', description: 'Find players and discuss events.' },
  { key: 'beginners', title: 'Beginner Help', description: 'Friendly room for new players.' },
];

function optionalAuth(req, _res, next) {
  try {
    const token = getRequestAccessToken(req);
    if (token) req.user = jwt.verify(token, getJwtSecret('access'));
  } catch {}
  next();
}

function authUserId(req) {
  return String(req.user?.userId || req.user?.id || '');
}

function cleanText(value, max = 1500) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function toPostType(value) {
  const type = String(value || '').toLowerCase();
  if (!POST_TYPES.has(type)) return null;
  return type.toUpperCase();
}

function toPostStatus(value) {
  const status = String(value || '').toLowerCase();
  if (!POST_STATUSES.has(status)) return null;
  return status.toUpperCase();
}

function safeJsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function safePost(post, userId) {
  const likes = safeJsonArray(post.likes);
  const comments = safeJsonArray(post.comments);
  return {
    _id: post.id,
    id: post.id,
    type: String(post.type || 'DISCUSSION').toLowerCase(),
    status: String(post.status || 'OPEN').toLowerCase(),
    title: post.title,
    body: post.body || '',
    content: post.body || '',
    authorName: post.authorName,
    author: post.authorId,
    authorSupporter: Boolean(post.authorSupporter),
    likesCount: likes.length,
    liked: Boolean(userId) && likes.some((id) => String(id) === String(userId)),
    comments: comments.slice(-8),
    isPinned: Boolean(post.isPinned),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function safeConversation(conversation) {
  return {
    _id: conversation.id,
    id: conversation.id,
    type: String(conversation.type || 'PRIVATE').toLowerCase(),
    roomKey: conversation.roomKey,
    title: conversation.title,
    participants: conversation.participants || [],
    messages: safeJsonArray(conversation.messages),
    mutedBy: conversation.mutedBy || [],
    blockedBy: conversation.blockedBy || [],
    reports: safeJsonArray(conversation.reports),
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

router.get('/community/posts', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const type = toPostType(req.query.type);
    const status = toPostStatus(req.query.status);
    const limit = Math.min(Number(req.query.limit) || 30, 50);

    const posts = await prisma.communityPost.findMany({
      where: {
        isPublic: true,
        isHidden: false,
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return res.json({ posts: posts.map((post) => safePost(post, userId)) });
  } catch (error) {
    return next(error);
  }
});

router.post('/community/posts', auth, async (req, res, next) => {
  try {
    const userId = authUserId(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) return res.status(401).json({ message: 'Please sign in to continue.' });
    const type = toPostType(req.body?.type) || 'FEEDBACK';
    const title = cleanText(req.body?.title, 120);
    const body = cleanText(req.body?.body || req.body?.content, 1500);
    if (title.length < 4) return res.status(400).json({ message: 'Title must be at least 4 characters.' });
    if (body.length < 10) return res.status(400).json({ message: 'Message must be at least 10 characters.' });
    const post = await prisma.communityPost.create({
      data: {
        authorId: user.id,
        authorName: user.username || 'ChessPlay Player',
        authorSupporter: Boolean(user.isPremium),
        type,
        status: 'OPEN',
        title,
        body,
        isPublic: true,
        isHidden: false,
        likes: [],
        comments: [],
      },
    });
    return res.status(201).json({ post: safePost(post, user.id) });
  } catch (error) {
    return next(error);
  }
});

router.post('/community/posts/:id/like', auth, async (req, res, next) => {
  try {
    const userId = authUserId(req);
    const post = await prisma.communityPost.findUnique({ where: { id: req.params.id } });
    if (!post || post.isHidden) return res.status(404).json({ message: 'Post not found.' });
    const likes = safeJsonArray(post.likes).map(String);
    const nextLikes = likes.includes(userId) ? likes.filter((id) => id !== userId) : [...likes, userId];
    const updated = await prisma.communityPost.update({ where: { id: post.id }, data: { likes: nextLikes } });
    return res.json({ post: safePost(updated, userId) });
  } catch (error) {
    return next(error);
  }
});

router.post('/community/posts/:id/comments', auth, async (req, res, next) => {
  try {
    const userId = authUserId(req);
    const [user, post] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.communityPost.findUnique({ where: { id: req.params.id } }),
    ]);
    if (!user || user.deletedAt) return res.status(401).json({ message: 'Please sign in to continue.' });
    if (!post || post.isHidden) return res.status(404).json({ message: 'Post not found.' });
    const text = cleanText(req.body?.text || req.body?.body, 500);
    if (text.length < 2) return res.status(400).json({ message: 'Comment must be at least 2 characters.' });
    const comments = safeJsonArray(post.comments);
    const nextComments = [
      ...comments,
      { _id: `${Date.now()}-${user.id}`, userId: user.id, username: user.username, text, createdAt: new Date().toISOString() },
    ].slice(-50);
    const updated = await prisma.communityPost.update({ where: { id: post.id }, data: { comments: nextComments } });
    return res.status(201).json({ post: safePost(updated, user.id) });
  } catch (error) {
    return next(error);
  }
});

router.get('/messaging/bootstrap', auth, async (req, res, next) => {
  try {
    const userId = authUserId(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });

    return res.json({ publicRooms: PUBLIC_ROOMS, friends: [] });
  } catch (error) {
    return next(error);
  }
});

router.get('/messaging/conversations', auth, async (req, res, next) => {
  try {
    const userId = authUserId(req);
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { type: 'PUBLIC' },
          { participants: { has: userId } },
        ],
      },
      orderBy: [
        { lastMessageAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 40,
    });

    return res.json({ conversations: conversations.map(safeConversation) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;