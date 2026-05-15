const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true, trim: true, maxlength: 40 },
  text: { type: String, required: true, trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const communityPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  authorName: { type: String, required: true, trim: true, maxlength: 40 },
  authorSupporter: { type: Boolean, default: false },
  type: { type: String, enum: ['announcement', 'feedback', 'bug', 'feature', 'discussion'], default: 'discussion', index: true },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'closed'], default: 'open', index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  body: { type: String, required: true, trim: true, maxlength: 1500 },
  isPublic: { type: Boolean, default: true, index: true },
  isPinned: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
}, { timestamps: true });

communityPostSchema.index({ isPublic: 1, isHidden: 1, type: 1, status: 1, createdAt: -1 });
communityPostSchema.index({ title: 'text', body: 'text' });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
