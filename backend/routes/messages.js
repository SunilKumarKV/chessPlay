const express = require('express');
const { isValidId } = require("../utils/id");
const auth = require('../middleware/auth');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

const router = express.Router();

const MESSAGE_MAX_LENGTH = 1000;
const SEARCH_LIMIT = 12;
const RECENT_CONVERSATION_LIMIT = 50;
const RECENT_MESSAGE_LIMIT = 80;
const sendRateLimit = new Map();

function userIdFromReq(req) {
  return req.user?.userId || req.user?.id;
}

function isObjectId(value) {
  return isValidId(String(value || ''));
}

function cleanText(value, max = MESSAGE_MAX_LENGTH) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function safeUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    id: user._id,
    username: user.username,
    avatar: user.avatar || null,
    rating: user.rating || 1200,
    isSupporter: Boolean(user.isSupporter || user.isPremium || user.adsDisabled),
  };
}

function toId(value) {
  return String(value?._id || value || '');
}

function isParticipant(conversation, userId) {
  return (conversation.participants || []).some((participant) => toId(participant) === String(userId));
}

function safeMessage(message, currentUserId) {
  const sender = typeof message.sender === 'object' ? message.sender : null;
  const senderId = toId(message.sender);
  return {
    _id: message._id,
    id: message._id,
    conversation: message.conversation,
    sender: sender ? safeUser(sender) : { _id: senderId, id: senderId, username: message.senderName || 'ChessPlay User' },
    senderId,
    senderName: message.senderName || sender?.username || 'ChessPlay User',
    body: message.body || message.text || '',
    text: message.body || message.text || '',
    createdAt: message.createdAt,
    isOwn: String(senderId) === String(currentUserId),
    read: (message.readBy || []).some((id) => String(id) === String(currentUserId)),
  };
}

function safeConversation(conversation, currentUserId) {
  const participants = (conversation.participants || []).map(safeUser).filter(Boolean);
  const messages = conversation.messages || [];
  const lastMessage = messages.length ? messages[messages.length - 1] : null;
  const otherParticipants = participants.filter((participant) => String(participant._id) !== String(currentUserId));
  const title = conversation.title || otherParticipants.map((participant) => participant.username).join(', ') || 'Conversation';
  const unreadCount = messages.filter((message) => {
    const senderId = toId(message.sender);
    const wasRead = (message.readBy || []).some((id) => String(id) === String(currentUserId));
    return senderId !== String(currentUserId) && !wasRead;
  }).length;

  return {
    _id: conversation._id,
    id: conversation._id,
    type: conversation.type || 'private',
    title,
    participants,
    otherParticipants,
    lastMessage: lastMessage ? safeMessage(lastMessage, currentUserId) : null,
    lastMessageAt: conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt,
    unreadCount,
    isMuted: (conversation.mutedBy || []).some((id) => String(id) === String(currentUserId)),
    isBlocked: (conversation.blockedBy || []).some((id) => String(id) === String(currentUserId)),
  };
}

function checkSendRateLimit(userId) {
  const now = Date.now();
  const key = String(userId);
  const current = sendRateLimit.get(key) || { count: 0, resetAt: now + 10_000 };
  if (now > current.resetAt) {
    sendRateLimit.set(key, { count: 1, resetAt: now + 10_000 });
    return false;
  }
  current.count += 1;
  sendRateLimit.set(key, current);
  return current.count > 8;
}

async function loadConversationForUser(conversationId, userId) {
  if (!isObjectId(conversationId)) {
    const error = new Error('Invalid conversation id.');
    error.status = 400;
    throw error;
  }

  const conversation = await Conversation.findById(conversationId).populate('participants', 'username avatar rating isSupporter isPremium adsDisabled').exec();
  if (!conversation) {
    const error = new Error('Conversation not found.');
    error.status = 404;
    throw error;
  }
  if (!isParticipant(conversation, userId)) {
    const error = new Error('You do not have access to this conversation.');
    error.status = 403;
    throw error;
  }
  return conversation;
}

router.get('/users/search', auth, async (req, res, next) => {
  try {
    const currentUserId = userIdFromReq(req);
    const query = cleanText(req.query.q, 60);
    if (query.length < 2) return res.json({ users: [] });

    const safeRegex = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      _id: { $ne: currentUserId },
      deletedAt: null,
      isBanned: { $ne: true },
      $or: [
        { username: { $regex: safeRegex, $options: 'i' } },
        { email: { $regex: safeRegex, $options: 'i' } },
      ],
    })
      .select('username avatar rating isSupporter isPremium adsDisabled')
      .limit(SEARCH_LIMIT)
      .lean();

    res.json({ users: users.map(safeUser) });
  } catch (error) {
    next(error);
  }
});

router.get('/conversations', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const conversations = await Conversation.find({ type: 'private', participants: userId })
      .populate('participants', 'username avatar rating isSupporter isPremium adsDisabled')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(RECENT_CONVERSATION_LIMIT)
      .exec();

    res.json({ conversations: conversations.map((conversation) => safeConversation(conversation, userId)) });
  } catch (error) {
    next(error);
  }
});

router.post('/conversations', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const participantId = cleanText(req.body.participantId, 80);
    if (!isObjectId(participantId)) return res.status(400).json({ message: 'Invalid participant.' });
    if (String(participantId) === String(userId)) return res.status(400).json({ message: 'You cannot message yourself.' });

    const [currentUser, participant] = await Promise.all([
      User.findById(userId).select('username avatar rating isSupporter isPremium adsDisabled'),
      User.findOne({ _id: participantId, deletedAt: null, isBanned: { $ne: true } }).select('username avatar rating isSupporter isPremium adsDisabled'),
    ]);

    if (!currentUser) return res.status(401).json({ message: 'Please sign in to continue.' });
    if (!participant) return res.status(404).json({ message: 'User not found.' });

    const ids = [String(currentUser._id), String(participant._id)].sort();
    let conversation = await Conversation.findOne({ type: 'private', participants: { $all: ids, $size: 2 } })
      .populate('participants', 'username avatar rating isSupporter isPremium adsDisabled')
      .exec();

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'private',
        title: '',
        participants: ids,
        messages: [],
        lastMessageAt: new Date(),
      });
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'username avatar rating isSupporter isPremium adsDisabled')
        .exec();
    }

    res.status(201).json({ conversation: safeConversation(conversation, userId) });
  } catch (error) {
    next(error);
  }
});

router.get('/conversations/:id', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const conversation = await loadConversationForUser(req.params.id, userId);
    res.json({ conversation: safeConversation(conversation, userId) });
  } catch (error) {
    next(error);
  }
});

router.get('/conversations/:id/messages', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const conversation = await loadConversationForUser(req.params.id, userId);
    const messages = (conversation.messages || []).slice(-RECENT_MESSAGE_LIMIT).map((message) => safeMessage(message, userId));
    res.json({ conversation: safeConversation(conversation, userId), messages });
  } catch (error) {
    next(error);
  }
});

router.post('/conversations/:id/messages', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    if (checkSendRateLimit(userId)) return res.status(429).json({ message: 'You are sending messages too quickly.' });

    const body = cleanText(req.body.body || req.body.text, MESSAGE_MAX_LENGTH);
    if (body.length < 1) return res.status(400).json({ message: 'Message cannot be empty.' });
    if (body.length > MESSAGE_MAX_LENGTH) return res.status(400).json({ message: `Message must be ${MESSAGE_MAX_LENGTH} characters or less.` });

    const conversation = await loadConversationForUser(req.params.id, userId);
    if ((conversation.blockedBy || []).some((id) => String(id) === String(userId))) {
      return res.status(403).json({ message: 'You blocked this conversation. Unblock it before sending.' });
    }

    const user = await User.findById(userId).select('username');
    if (!user) return res.status(401).json({ message: 'Please sign in to continue.' });

    conversation.messages.push({
      sender: user._id,
      senderName: user.username,
      text: body,
      readBy: [user._id],
      createdAt: new Date(),
    });
    if (conversation.messages.length > 300) conversation.messages = conversation.messages.slice(-300);
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const savedMessage = conversation.messages[conversation.messages.length - 1];
    res.status(201).json({ message: safeMessage(savedMessage, userId), conversation: safeConversation(conversation, userId) });
  } catch (error) {
    next(error);
  }
});

router.patch('/conversations/:id/read', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const conversation = await loadConversationForUser(req.params.id, userId);
    let changed = false;
    conversation.messages.forEach((message) => {
      const fromCurrentUser = toId(message.sender) === String(userId);
      const alreadyRead = (message.readBy || []).some((id) => String(id) === String(userId));
      if (!fromCurrentUser && !alreadyRead) {
        message.readBy.push(userId);
        changed = true;
      }
    });
    if (changed) await conversation.save();
    res.json({ conversation: safeConversation(conversation, userId), message: 'Conversation marked as read.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
