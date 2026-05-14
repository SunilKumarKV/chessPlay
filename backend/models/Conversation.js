const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true, trim: true, maxlength: 40 },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const conversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['private', 'public'], default: 'private' },
  title: { type: String, trim: true, maxlength: 80, default: '' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  roomKey: { type: String, trim: true, lowercase: true, default: null },
  messages: [messageSchema],
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reports: [{
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true, maxlength: 300 },
    createdAt: { type: Date, default: Date.now },
  }],
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ type: 1, roomKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Conversation', conversationSchema);
