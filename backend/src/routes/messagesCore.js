const express = require('express');
const auth = require('../middleware/auth');
const { prisma } = require('../src/config/prisma');

const router = express.Router();
const MESSAGE_MAX_LENGTH = 1000;
const SEARCH_LIMIT = 12;
const RECENT_CONVERSATION_LIMIT = 50;
const RECENT_MESSAGE_LIMIT = 80;

function userIdFromReq(req) {
  return String(req.user?.userId || req.user?.id || '');
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

function safeJsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeUser(user) {
  if (!user) return null;
  return {
    _id: user.id,
    id: user.id,
    username: user.username,
    avatar: null,
    rating: user.rating || 1200,
    isSupporter: Boolean(user.isPremium),
    isPremium: Boolean(user.isPremium),
  };
}

function safeMessage(message, currentUserId) {
  const senderId = String(message.senderId || message.sender || '');
  return {
    _id: message._id || message.id || `${senderId}-${message.createdAt}`,
    id: message._id || message.id || `${senderId}-${message.createdAt}`,
    conversation: message.conversation,
    sender: {
      _id: senderId,
      id: senderId,
      username: message.senderName || 'ChessPlay User',
      avatar: null,
    },
    senderId,
    senderName: message.senderName || 'ChessPlay User',
    body: message.body || message.text || '',
    text: message.body || message.text || '',
    createdAt: message.createdAt,
    isOwn: senderId === String(currentUserId),
    read: safeJsonArray(message.readBy).some((id) => String(id) === String(currentUserId)),
  };
}

async function usersById(ids) {
  const uniqueIds = [...new Set(ids.map(String).filter(Boolean))];
  if (!uniqueIds.length) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: uniqueIds }, deletedAt: null } });
  return new Map(users.map((user) => [user.id, user]));
}

function conversationTitle(conversation, currentUserId, userMap) {
  if (conversation.title) return conversation.title;
  const others = safeJsonArray(conversation.participants)
    .filter((id) => String(id) !== String(currentUserId))
    .map((id) => userMap.get(String(id))?.username)
    .filter(Boolean);
  return others.join(', ') || 'Conversation';
}

async function safeConversation(conversation, currentUserId) {
  const participants = safeJsonArray(conversation.participants).map(String);
  const userMap = await usersById(participants);
  const participantUsers = participants.map((id) => safeUser(userMap.get(id))).filter(Boolean);
  const messages = safeJsonArray(conversation.messages);
  const lastMessage = messages.length ? messages[messages.length - 1] : null;
  const otherParticipants = participantUsers.filter((participant) => String(participant.id) !== String(currentUserId));
  const unreadCount = messages.filter((message) => {
    const senderId = String(message.senderId || message.sender || '');
    return senderId !== String(currentUserId) && !safeJsonArray(message.readBy).some((id) => String(id) === String(currentUserId));
  }).length;

  return {
    _id: conversation.id,
    id: conversation.id,
    type: String(conversation.type || 'PRIVATE').toLowerCase(),
    roomKey: conversation.roomKey,
    title: conversationTitle(conversation, currentUserId, userMap),
    participants: participantUsers,
    otherParticipants,
    lastMessage: lastMessage ? safeMessage(lastMessage, currentUserId) : null,
    lastMessageAt: conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt,
    unreadCount,
    isMuted: safeJsonArray(conversation.mutedBy).some((id) => String(id) === String(currentUserId)),
    isBlocked: safeJsonArray(conversation.blockedBy).some((id) => String(id) === String(currentUserId)),
  };
}

async function loadConversationForUser(conversationId, userId) {
  const conversation = await prisma.conversation.findUnique({ where: { id: String(conversationId) } });
  if (!conversation) {
    const error = new Error('Conversation not found.');
    error.status = 404;
    throw error;
  }
  if (!safeJsonArray(conversation.participants).some((id) => String(id) === String(userId))) {
    const error = new Error('You do not have access to this conversation.');
    error.status = 403;
    throw error;
  }
  return conversation;
}

router.get('/users/search', auth, async (req, res, next) => {
  try {
    const currentUserId = userIdFromReq(req);
    const query = cleanText(req.query.q, 60).toLowerCase();
    if (query.length < 2) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        id: { not: currentUserId },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { username: 'asc' },
      take: SEARCH_LIMIT,
    });

    return res.json({ users: users.map(safeUser) });
  } catch (error) {
    return next(error);
  }
});

router.get('/conversations', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const conversations = await prisma.conversation.findMany({
      where: { type: 'PRIVATE', participants: { has: userId } },
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      take: RECENT_CONVERSATION_LIMIT,
    });
    const safe = await Promise.all(conversations.map((conversation) => safeConversation(conversation, userId)));
    return res.json({ conversations: safe });
  } catch (error) {
    return next(error);
  }
});

router.post('/conversations', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const participantId = cleanText(req.body?.participantId, 80);
    if (!participantId) return res.status(400).json({ message: 'Invalid participant.' });
    if (participantId === userId) return res.status(400).json({ message: 'You cannot message yourself.' });

    const [currentUser, participant] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: participantId } }),
    ]);
    if (!currentUser || currentUser.deletedAt) return res.status(401).json({ message: 'Please sign in to continue.' });
    if (!participant || participant.deletedAt) return res.status(404).json({ message: 'User not found.' });

    const participants = [userId, participantId].sort();
    const existing = await prisma.conversation.findFirst({
      where: { type: 'PRIVATE', participants: { hasEvery: participants } },
      orderBy: { updatedAt: 'desc' },
    });

    const conversation = existing || await prisma.conversation.create({
      data: {
        type: 'PRIVATE',
        title: null,
        participants,
        messages: [],
        lastMessageAt: new Date(),
      },
    });

    return res.status(existing ? 200 : 201).json({ conversation: await safeConversation(conversation, userId) });
  } catch (error) {
    return next(error);
  }
});

router.get('/conversations/:id', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const conversation = await loadConversationForUser(req.params.id, userId);
    return res.json({ conversation: await safeConversation(conversation, userId) });
  } catch (error) {
    return next(error);
  }
});

router.get('/conversations/:id/messages', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const conversation = await loadConversationForUser(req.params.id, userId);
    const messages = safeJsonArray(conversation.messages).slice(-RECENT_MESSAGE_LIMIT).map((message) => safeMessage(message, userId));
    return res.json({ conversation: await safeConversation(conversation, userId), messages });
  } catch (error) {
    return next(error);
  }
});

router.post('/conversations/:id/messages', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const body = cleanText(req.body?.body || req.body?.text, MESSAGE_MAX_LENGTH);
    if (!body) return res.status(400).json({ message: 'Message cannot be empty.' });

    const [user, conversation] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      loadConversationForUser(req.params.id, userId),
    ]);
    if (!user || user.deletedAt) return res.status(401).json({ message: 'Please sign in to continue.' });

    const messages = safeJsonArray(conversation.messages);
    const message = {
      _id: `${Date.now()}-${user.id}`,
      conversation: conversation.id,
      senderId: user.id,
      senderName: user.username,
      body,
      text: body,
      readBy: [user.id],
      createdAt: new Date().toISOString(),
    };
    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { messages: [...messages, message].slice(-300), lastMessageAt: new Date() },
    });

    return res.status(201).json({ message: safeMessage(message, userId), conversation: await safeConversation(updated, userId) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/conversations/:id/read', auth, async (req, res, next) => {
  try {
    const userId = userIdFromReq(req);
    const conversation = await loadConversationForUser(req.params.id, userId);
    const messages = safeJsonArray(conversation.messages).map((message) => {
      const senderId = String(message.senderId || message.sender || '');
      const readBy = safeJsonArray(message.readBy).map(String);
      if (senderId !== userId && !readBy.includes(userId)) return { ...message, readBy: [...readBy, userId] };
      return message;
    });
    const updated = await prisma.conversation.update({ where: { id: conversation.id }, data: { messages } });
    return res.json({ conversation: await safeConversation(updated, userId), message: 'Conversation marked as read.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
