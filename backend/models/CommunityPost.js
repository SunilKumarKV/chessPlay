const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true, trim: true, maxlength: 40 },
  text: { type: String, required: true, trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const communityPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true, trim: true, maxlength: 40 },
  type: { type: String, enum: ['post', 'puzzle', 'discussion', 'achievement', 'tournament'], default: 'post' },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  content: { type: String, required: true, trim: true, maxlength: 1500 },
  puzzleFen: { type: String, trim: true, maxlength: 120, default: '' },
  puzzleSolution: { type: String, trim: true, maxlength: 80, default: '' },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  isPinned: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false },
}, { timestamps: true });

communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ type: 1, createdAt: -1 });
communityPostSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
