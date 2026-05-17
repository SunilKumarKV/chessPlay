const mongoose = require("mongoose");

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 180, unique: true, index: true },
    excerpt: { type: String, trim: true, maxlength: 300, default: "" },
    body: { type: String, trim: true, maxlength: 20000, default: "" },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    publishedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BlogPost", blogPostSchema);
