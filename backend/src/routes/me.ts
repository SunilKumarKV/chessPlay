// @ts-nocheck
import express from "express";
import auth from "../middleware/auth";
import { getUserEntitlements } from "../middleware/entitlements";

const router = express.Router();

router.get("/entitlements", auth, async (req, res) => {
  try {
    const state = await getUserEntitlements(req.user.userId);
    res.json(state);
  } catch {
    res.status(500).json({ message: "Unable to load entitlements." });
  }
});

export default router;
