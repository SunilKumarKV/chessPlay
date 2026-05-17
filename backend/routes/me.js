const express = require("express");
const auth = require("../middleware/auth");
const { getUserEntitlements } = require("../middleware/entitlements");

const router = express.Router();

router.get("/entitlements", auth, async (req, res) => {
  try {
    const state = await getUserEntitlements(req.user.userId);
    res.json(state);
  } catch {
    res.status(500).json({ message: "Unable to load entitlements." });
  }
});

module.exports = router;
