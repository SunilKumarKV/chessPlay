const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const CommunityPost = require('../models/CommunityPost');
const Conversation = require('../models/Conversation');

const router = express.Router();
const POST_TYPES = new Set(['post', 'puzzle', 'discussion', 'achievement', 'tournament']);
const PUBLIC_ROOMS = [
  { key: 'general', title: 'General Chess Chat', description: 'Public lounge for ChessPlay users.' },
  { key: 'puzzles', title: 'Puzzle Room', description: 'Discuss tactics and daily puzzle ideas.' },
  { key: 'tournaments', title: 'Tournament Room', description: 'Find players and discuss events.' },
  { key: 'beginners', title: 'Beginner Help', description: 'Friendly room for new players.' },
];

function cleanText(value, max = 500) {
  return String(value || '').replace(/<[^>]*>/g, '').trim().slice(0, max);
}

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
    title: post.title,
    content: post.content,
    authorName: post.authorName,
    author: post.author,
    puzzleFen: post.puzzleFen,
    puzzleSolution: post.puzzleSolution ? 'Hidden until you try it' : '',
    tournamentId: post.tournamentId,
    likesCount: likes.length,
    liked: likes.some((id) => String(id) === String(userId)),
    comments: (post.comments || []).slice(-8),
    isPinned: post.isPinned,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

router.get('/community/posts', auth, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const type = POST_TYPES.has(req.query.type) ? req.query.type : null;
    const query = { isHidden: false };
    if (type) query.type = type;
    const posts = await CommunityPost.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 30, 50))
      .lean();
    res.json({ posts: posts.map((post) => safePost(post, user._id)) });
  } catch (error) {
    next(error);
  }
});

router.post('/community/posts', auth, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const type = POST_TYPES.has(req.body.type) ? req.body.type : 'post';
    const title = cleanText(req.body.title, 120);
    const content = cleanText(req.body.content, 1500);
    if (!title || !content) return res.status(400).json({ message: 'Title and content are required' });

    const post = await CommunityPost.create({
      author: user._id,
      authorName: user.username,
      type,
      title,
      content,
      puzzleFen: cleanText(req.body.puzzleFen, 120),
      puzzleSolution: cleanText(req.body.puzzleSolution, 80),
      tournamentId: mongoose.Types.ObjectId.isValid(req.body.tournamentId) ? req.body.tournamentId : null,
    });
    res.status(201).json({ post: safePost(post, user._id) });
  } catch (error) {
    next(error);
  }
});

router.post('/community/posts/:id/like', auth, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req);
    const post = await CommunityPost.findOne({ _id: req.params.id, isHidden: false });
    if (!post) return res.status(404).json({ message: 'Post not found' });
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
    const user = await getCurrentUser(req);
    const text = cleanText(req.body.text, 500);
    if (!text) return res.status(400).json({ message: 'Comment is required' });
    const post = await CommunityPost.findOne({ _id: req.params.id, isHidden: false });
    if (!post) return res.status(404).json({ message: 'Post not found' });
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
  if (!mongoose.Types.ObjectId.isValid(friendId)) {
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
