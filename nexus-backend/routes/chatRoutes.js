import express from "express";
import { protect } from "../middleware/auth.js";
import { getConversations, getMessagesWithUser, sendChatMessage } from "../controllers/chatController.js";

const router = express.Router();

router.get("/conversations", protect, getConversations);
router.get("/:userId", protect, getMessagesWithUser);
router.post("/", protect, sendChatMessage);

export default router;