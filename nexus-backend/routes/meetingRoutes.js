import express from "express";
import {
  createMeeting,
  getMyMeetings,
  acceptMeeting,
  rejectMeeting,
  cancelMeeting,
} from "../controllers/meetingController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createMeeting);
router.get("/", protect, getMyMeetings);
router.put("/:id/accept", protect, acceptMeeting);
router.put("/:id/reject", protect, rejectMeeting);
router.delete("/:id", protect, cancelMeeting);

export default router;