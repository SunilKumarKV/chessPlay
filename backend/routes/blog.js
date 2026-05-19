const express = require("express");
const { isValidId } = require("../utils/id");
const auth = require("../middleware/auth");
const BlogPost = require("../models/BlogPost");
const User = require("../models/User");
const { sanitizeText, isConfiguredAdminEmail } = require("../utils/security");

const router = express.Router();

function slugify(value) {
  return sanitizeText(value || "", 160)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function isValidObjectId(id) {
  return isValidId(String(id || ""));
}

async function requireAdmin(req, res, next) {
  const user = await User.findById(req.user?.userId).select("email isAdmin deletedAt isBanned");
  if (!user || user.deletedAt || user.isBanned || (!user.isAdmin && !isConfiguredAdminEmail(user.email))) {
    return res.status(403).json({ message: "Admin access required." });
  }
  req.adminUser = user;
  return next();
}

router.get("/", async (req, res) => {
  const posts = await BlogPost.find({ status: "published" }).sort({ publishedAt: -1, createdAt: -1 }).limit(50).select("-body");
  res.json({ posts });
});

router.get("/:slug", async (req, res) => {
  const post = await BlogPost.findOne({ slug: slugify(req.params.slug), status: "published" });
  if (!post) return res.status(404).json({ message: "Blog post not found." });
  res.json({ post });
});

router.post("/", auth, requireAdmin, async (req, res) => {
  const title = sanitizeText(req.body.title || "", 160);
  if (!title) return res.status(400).json({ message: "Title is required." });
  const status = ["draft", "published"].includes(req.body.status) ? req.body.status : "draft";
  const post = await BlogPost.create({
    title,
    slug: slugify(req.body.slug || title),
    excerpt: sanitizeText(req.body.excerpt || "", 300),
    body: sanitizeText(req.body.body || "", 20000),
    tags: Array.isArray(req.body.tags) ? req.body.tags.map((tag) => sanitizeText(tag, 40).toLowerCase()).filter(Boolean).slice(0, 12) : [],
    status,
    author: req.adminUser._id,
    publishedAt: status === "published" ? new Date() : null,
  });
  res.status(201).json({ post });
});

router.patch("/:id", auth, requireAdmin, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid blog post id." });
  const post = await BlogPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Blog post not found." });
  if (typeof req.body.title === "string") post.title = sanitizeText(req.body.title, 160);
  if (typeof req.body.slug === "string") post.slug = slugify(req.body.slug);
  if (typeof req.body.excerpt === "string") post.excerpt = sanitizeText(req.body.excerpt, 300);
  if (typeof req.body.body === "string") post.body = sanitizeText(req.body.body, 20000);
  if (["draft", "published", "archived"].includes(req.body.status)) {
    post.status = req.body.status;
    if (req.body.status === "published" && !post.publishedAt) post.publishedAt = new Date();
  }
  await post.save();
  res.json({ post });
});

router.delete("/:id", auth, requireAdmin, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid blog post id." });
  const post = await BlogPost.findByIdAndDelete(req.params.id);
  if (!post) return res.status(404).json({ message: "Blog post not found." });
  res.json({ message: "Blog post deleted." });
});

module.exports = router;
