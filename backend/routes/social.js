const express = require('express');
const { isValidId } = require("../utils/id");
const auth = require('../middleware/auth');
const User = require('../models/User');
const CommunityPost = require('../models/CommunityPost');
const Conversation = require('../models/Conversation');

const router = express.Router();
const POST_TYPES = new Set(['announcement', 'feedback', 'bug', 'feature', 'discussion']);
const POST_STATUSES = new Set(['open', 'reviewing', 'resolved', 'closed']);
const PUBLIC_ROOMS = [
  { key: 'general', title: 'General Chess Chat', description: 'Public lounge for ChessPlay users.' },
  { key: 'puzzles', title: 'Puzzle Room', description: 'Discuss tactics and daily puzzle ideas.' },
  { key: 'tournaments', title: 'Tournament Room', description: 'Find players and discuss events.' },
  { key: 'beginners', title: 'Beginner Help', description: 'Friendly room for new players.' },
];

function cleanText(value, max = 500) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim().slice(0, max);
}

function optionalAuth(req, _res, next) {
  try {
    const { getRequestAccessToken, getJwtSecret } = require('../utils/security');
    const jwt = require('jsonwebtoken');
    const token = getRequestAccessToken(req);
    if (token) req.user = jwt.verify(token, getJwtSecret('access'));
  } catch {}
  next();
}

function validObjectId(id) { return isValidId(id); }


async function getCurrentUser(req) {
  const user = await User.findById(req.user.userId || req.user.id).select('username friends privacy isAdmin');
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return user;
}

function safePost(post, userId) {
  const likes = post.likes || [];
  return {
    _id: post._id,
    type: post.type,
    status: post.status || 'open',
    title: post.title,
    body: post.body || post.content || '',
    content: post.body || post.content || '',
    authorName: post.authorName,
    author: post.author,
    authorSupporter: Boolean(post.authorSupporter),
    likesCount: likes.length,
    liked: Boolean(userId) && likes.some((id) => String(id) === String(userId)),
    comments: (post.comments || []).slice(-8),
    isPinned: post.isPinned,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}


router.get('/community/posts', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id || null;
    const type = POST_TYPES.has(req.query.type) ? req.query.type : null;
    const status = POST_STATUSES.has(req.query.status) ? req.query.status : null;
    const query = { isPublic: true, isHidden: false };
    if (type) query.type = type;
    if (status) query.status = status;
    const posts = await CommunityPost.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 30, 50))
      .lean();
    res.json({ posts: posts.map((post) => safePost(post, userId)) });
  } catch (error) {
    next(error);
  }
});

router.post('/community/posts', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId || req.user.id).select('username isSupporter isPremium adsDisabled');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const type = POST_TYPES.has(req.body.type) ? req.body.type : 'discussion';
    const title = cleanText(req.body.title, 120);
    const body = cleanText(req.body.body || req.body.content, 1500);
    if (title.length < 4) return res.status(400).json({ message: 'Title must be at least 4 characters.' });
    if (body.length < 10) return res.status(400).json({ message: 'Message must be at least 10 characters.' });

    const post = await CommunityPost.create({
      author: user._id,
      authorName: user.username,
      authorSupporter: Boolean(user.isSupporter || user.isPremium || user.adsDisabled),
      type,
      title,
      body,
      status: type === 'bug' || type === 'feature' || type === 'feedback' ? 'open' : 'open',
      isPublic: true,
    });
    res.status(201).json({ message: 'Post submitted successfully.', post: safePost(post, user._id) });
  } catch (error) {
    next(error);
  }
});

router.patch('/community/posts/:id/status', auth, async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid community post id.' });
    const actor = await User.findById(req.user.userId || req.user.id).select('isAdmin email username');
    const { isConfiguredAdminEmail } = require('../utils/security');
    if (!actor || (!actor.isAdmin && !isConfiguredAdminEmail(actor.email))) {
      return res.status(403).json({ message: 'You do not have permission to update this post.' });
    }
    const status = String(req.body.status || '').toLowerCase();
    if (!POST_STATUSES.has(status)) return res.status(400).json({ message: 'Invalid post status.' });
    const post = await CommunityPost.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!post || post.isHidden) return res.status(404).json({ message: 'Community post not found.' });
    const AdminAuditLog = require('../models/AdminAuditLog');
    AdminAuditLog.create({
      actor: actor._id,
      action: 'community_status_updated',
      targetType: 'CommunityPost',
      targetId: String(post._id),
      details: { status },
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    }).catch(() => {});
    res.json({ message: 'Community post status updated.', post: safePost(post, actor._id) });
  } catch (error) {
    next(error);
  }
});

router.post('/community/posts/:id/like', auth, async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid community post id.' });
    const user = await getCurrentUser(req);
    const post = await CommunityPost.findOne({ _id: req.params.id, isPublic: true, isHidden: false });
    if (!post) return res.status(404).json({ message: 'Community post not found.' });
    const liked = post.likes.some((id) => String(id) === String(user._id));
    if (liked) post.likes = post.likes.filter((id) => String(id) !== String(user._id));
    else post.likes.push(user._id);
    await post.save();
    res.json({ post: safePost(post, user._id) });
  } catch (error) {
    next(error);
  }
});

router.post('/community/posts/:id/comments', auth, async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid community post id.' });
    const user = await getCurrentUser(req);
    const text = cleanText(req.body.text, 500);
    if (text.length < 2) return res.status(400).json({ message: 'Comment must be at least 2 characters.' });
    const post = await CommunityPost.findOne({ _id: req.params.id, isPublic: true, isHidden: false });
    if (!post) return res.status(404).json({ message: 'Community post not found.' });
    post.comments.push({ user: user._id, username: user.username, text });
    if (post.comments.length > 100) post.comments = post.comments.slice(-100);
    await post.save();
    res.status(201).json({ post: safePost(post, user._id) });
  } catch (error) {
    next(error);
  }
});

router.get('/messaging/bootstrap', auth, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const populated = await User.findById(user._id).populate('friends', 'username rating avatar privacy').lean();
    const friends = (populated.friends || []).map((friend) => ({
      _id: friend._id,
      username: friend.username,
      rating: friend.rating,
      avatar: friend.avatar,
      onlineVisible: friend.privacy?.onlineStatus !== false,
    }));
    res.json({ publicRooms: PUBLIC_ROOMS, friends });
  } catch (error) {
    next(error);
  }
});

router.get('/messaging/conversations', auth, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const conversations = await Conversation.find({
      $or: [{ participants: user._id }, { type: 'public' }],
    })
      .sort({ lastMessageAt: -1 })
      .limit(40)
      .lean();
    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

async function getOrCreatePublicRoom(key) {
  const room = PUBLIC_ROOMS.find((item) => item.key === key) || PUBLIC_ROOMS[0];
  return Conversation.findOneAndUpdate(
    { type: 'public', roomKey: room.key },
    { $setOnInsert: { title: room.title, type: 'public', roomKey: room.key, participants: [] } },
    { upsert: true, new: true },
  );
}

async function getOrCreatePrivateConversation(user, friendId) {
  if (!isValidId(friendId)) {
    const error = new Error('Invalid friend id');
    error.status = 400;
    throw error;
  }
  const friend = await User.findById(friendId).select('username');
  if (!friend) {
    const error = new Error('Friend not found');
    error.status = 404;
    throw error;
  }
  const ids = [String(user._id), String(friend._id)].sort();
  return Conversation.findOneAndUpdate(
    { type: 'private', participants: { $all: ids, $size: 2 } },
    { $setOnInsert: { type: 'private', participants: ids, title: `${user.username} ↔ ${friend.username}` } },
    { upsert: true, new: true },
  );
}

router.post('/messaging/open', auth, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const conversation = req.body.type === 'public'
      ? await getOrCreatePublicRoom(cleanText(req.body.roomKey, 40).toLowerCase())
      : await getOrCreatePrivateConversation(user, req.body.friendId);
    res.json({ conversation });
  } catch (error) {
    next(error);
  }
});

router.get('/messaging/conversations/:id/messages', auth, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const conversation = await Conversation.findById(req.params.id).lean();
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const isAllowed = conversation.type === 'public' || conversation.participants.some((id) => String(id) === String(user._id));
    if (!isAllowed) return res.status(403).json({ message: 'Not allowed' });
    res.json({ messages: (conversation.messages || []).slice(-80), conversation });
  } catch (error) {
    next(error);
  }
});

router.post('/messaging/conversations/:id/messages', auth, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const text = cleanText(req.body.text, 1000);
    if (!text) return res.status(400).json({ message: 'Message is required' });
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const isAllowed = conversation.type === 'public' || conversation.participants.some((id) => String(id) === String(user._id));
    if (!isAllowed) return res.status(403).json({ message: 'Not allowed' });
    if (conversation.blockedBy.some((id) => String(id) === String(user._id))) {
      return res.status(403).json({ message: 'You blocked this conversation. Unblock to send.' });
    }
    conversation.messages.push({ sender: user._id, senderName: user.username, text, readBy: [user._id] });
    if (conversation.messages.length > 300) conversation.messages = conversation.messages.slice(-300);
    conversation.lastMessageAt = new Date();
    await conversation.save();
    res.status(201).json({ message: conversation.messages[conversation.messages.length - 1], conversation });
  } catch (error) {
    next(error);
  }
});

router.post('/messaging/conversations/:id/moderation', auth, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const action = req.body.action;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const setField = action === 'mute' ? 'mutedBy' : action === 'block' ? 'blockedBy' : null;
    if (setField) {
      const exists = conversation[setField].some((id) => String(id) === String(user._id));
      if (exists) conversation[setField] = conversation[setField].filter((id) => String(id) !== String(user._id));
      else conversation[setField].push(user._id);
    } else if (action === 'report') {
      conversation.reports.push({ reporter: user._id, reason: cleanText(req.body.reason, 300) || 'Reported from app' });
    } else {
      return res.status(400).json({ message: 'Unsupported action' });
    }
    await conversation.save();
    res.json({ conversation });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
