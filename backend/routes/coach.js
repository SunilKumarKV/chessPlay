const express = require("express");
const auth = require("../middleware/auth");
const { requireFeature } = require("../middleware/entitlements");
const { sanitizeText } = require("../utils/security");

const router = express.Router();

router.post("/session", auth, requireFeature("advancedAnalysis"), async (req, res) => {
  const fen = sanitizeText(req.body.fen || "", 120);
  const goal = sanitizeText(req.body.goal || "Improve my position", 300);
  res.json({
    mode: "premium_coach_placeholder",
    engineAvailable: false,
    message: "AI Coach foundation is ready. Server-side engine coaching is not enabled on this deployment.",
    coaching: {
      goal,
      fen,
      nextSteps: [
        "Check forcing moves first: checks, captures, threats.",
        "Compare king safety, loose pieces, and pawn breaks.",
        "Save this position for future deeper analysis when engine coaching is enabled.",
      ],
    },
  });
});

module.exports = router;
