const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();
const PUBLIC_USER_FIELDS = "username avatar country title rating gamesPlayed gamesWon privacy friends";
const FRIEND_USER_FIELDS = "username avatar country title rating gamesPlayed gamesWon";

function isFriend(user, otherUserId) {
  return Boolean(
    user?.friends?.some((friendId) => String(friendId) === String(otherUserId)),
  );
}

function publicUser(user, relationship = "none") {
  return {
    id: user._id,
    username: user.username,
    avatar: user.avatar || null,
    country: user.country,
    title: user.title,
    rating: user.rating,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    relationship,
  };
}

function publicProfile(user) {
  return {
    id: user._id,
    _id: user._id,
    username: user.username,
    avatar: user.avatar || null,
    country: user.country,
    title: user.title,
    bio: user.bio || "",
    createdAt: user.createdAt,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon,
    gamesLost: user.gamesLost,
    gamesDrawn: user.gamesDrawn,
    rating: user.rating,
    puzzleRating: user.puzzleRating,
    highestPuzzleRating: user.highestPuzzleRating,
    puzzlesSolved: user.puzzlesSolved,
  };
}

function createRateLimiter({ windowMs, max, message }) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(max - bucket.count, 0);
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(remaining));
    res.set("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }

    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }

    next();
  };
}

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Register
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!username || !usernameRegex.test(username)) {
      return res.status(400).json({ message: "Username must be alphanumeric only" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already exists"
            : "Username already exists",
      });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        rating: user.rating,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        rating: user.rating,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get current user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get specific user profile by ID
router.get("/profile/:userId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(PUBLIC_USER_FIELDS + " bio createdAt gamesLost gamesDrawn puzzleRating highestPuzzleRating puzzlesSolved");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const ownProfile = String(user._id) === String(req.user.userId);
    if (
      !ownProfile &&
      user.privacy?.profileVisibility === false &&
      !isFriend(user, req.user.userId)
    ) {
      return res.status(403).json({ message: "This profile is private" });
    }

    res.json({ user: publicProfile(user) });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search users for friend discovery
router.get("/users/search", auth, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (query.length < 2) {
      return res.json({ users: [] });
    }

    const currentUser = await User.findById(req.user.userId).select(
      "friends friendRequests",
    );
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const users = await User.find({
      _id: { $ne: req.user.userId },
      username: { $regex: query, $options: "i" },
    })
      .select(PUBLIC_USER_FIELDS)
      .limit(10);

    const friendIds = new Set(currentUser.friends.map((id) => String(id)));
    const incomingIds = new Set(
      currentUser.friendRequests
        .filter((request) => request.status === "pending")
        .map((request) => String(request.from)),
    );

    const usersWithStatus = (
      await Promise.all(
        users.map(async (candidate) => {
          const candidateId = String(candidate._id);
          const pendingOutgoing = await User.exists({
            _id: candidateId,
            friendRequests: {
              $elemMatch: {
                from: req.user.userId,
                status: "pending",
              },
            },
          });

          const relationship = friendIds.has(candidateId)
            ? "friend"
            : incomingIds.has(candidateId)
              ? "incoming"
              : pendingOutgoing
                ? "pending"
                : "none";

          if (
            candidate.privacy?.profileVisibility === false &&
            relationship !== "friend" &&
            relationship !== "incoming"
          ) {
            return null;
          }

          return publicUser(candidate, relationship);
        }),
      )
    ).filter(Boolean);

    res.json({ users: usersWithStatus });
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get friends and pending requests
router.get("/friends", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("friends friendRequests")
      .populate("friends", FRIEND_USER_FIELDS)
      .populate("friendRequests.from", FRIEND_USER_FIELDS);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      friends: user.friends.map((friend) => publicUser(friend, "friend")),
      requests: user.friendRequests
        .filter((request) => request.status === "pending" && request.from)
        .map((request) => ({
          id: request._id,
          from: publicUser(request.from, "incoming"),
          createdAt: request.createdAt,
        })),
    });
  } catch (error) {
    console.error("Friends load error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send friend request
router.post("/friends/request", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || userId === req.user.userId) {
      return res.status(400).json({ message: "Invalid user" });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.user.userId),
      User.findById(userId),
    ]);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.friends.some((friendId) => String(friendId) === String(userId))) {
      return res.status(400).json({ message: "Already friends" });
    }

    if (targetUser.privacy?.friendRequests === false) {
      return res.status(403).json({ message: "This player is not accepting friend requests" });
    }

    const hasPending = targetUser.friendRequests.some(
      (request) =>
        String(request.from) === String(req.user.userId) &&
        request.status === "pending",
    );
    if (!hasPending) {
      targetUser.friendRequests.push({ from: req.user.userId });
      await targetUser.save();
    }

    res.json({ message: "Friend request sent" });
  } catch (error) {
    console.error("Friend request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Accept or decline friend request
router.post("/friends/respond", auth, async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const request = user.friendRequests.id(requestId);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Request not found" });
    }

    if (action === "accept") {
      request.status = "accepted";
      if (!user.friends.some((id) => String(id) === String(request.from))) {
        user.friends.push(request.from);
      }
      await User.findByIdAndUpdate(request.from, {
        $addToSet: { friends: user._id },
      });
    } else {
      request.status = "declined";
    }

    await user.save();
    res.json({ message: action === "accept" ? "Friend added" : "Request declined" });
  } catch (error) {
    console.error("Friend response error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { username, email, bio, avatar, country, privacy } = req.body;
    const userId = req.user.userId;
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Check if username or email is already taken by another user
    if (username) {
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ message: "Username must be alphanumeric only" });
      }

      const existingUsername = await User.findOne({
        username,
        _id: { $ne: userId }
      });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    if (email) {
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already taken" });
      }
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email.toLowerCase();
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar || null;
    if (country !== undefined) updateData.country = country;
    if (privacy && typeof privacy === "object") {
      updateData.privacy = {
        profileVisibility: privacy.profileVisibility !== false,
        gameHistory: privacy.gameHistory !== false,
        onlineStatus: privacy.onlineStatus !== false,
        friendRequests: privacy.friendRequests !== false,
        spectatorMode: Boolean(privacy.spectatorMode),
      };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Change password
router.put("/password", authLimiter, auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get leaderboard
router.get("/leaderboard", auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const users = await User.find({})
      .select("username rating gamesPlayed gamesWon")
      .sort({ rating: -1 })
      .limit(limit);

    res.json(users);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
