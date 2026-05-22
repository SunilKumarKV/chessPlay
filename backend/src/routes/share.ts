// @ts-nocheck
import express from "express";
import auth from "../middleware/auth";
import { sanitizeText } from "../utils/security";

const router = express.Router();

router.post("/achievement", auth, async (req, res) => {
  const type = sanitizeText(req.body.type || "achievement", 40);
  const title = sanitizeText(req.body.title || "ChessPlay achievement", 120);
  const description = sanitizeText(req.body.description || "I reached a new ChessPlay milestone.", 240);
  res.status(201).json({
    metadata: {
      type,
      title,
      description,
      url: `${process.env.FRONTEND_URL || "https://getchessplay.com"}/share/${encodeURIComponent(type)}`,
      imageRequired: false,
    },
  });
});

export default router;
