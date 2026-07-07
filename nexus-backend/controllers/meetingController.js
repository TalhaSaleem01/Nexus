import { Op } from "sequelize";
import { Meeting, User } from "../models/associations.js";

const userPublicFields = ["id", "name", "email", "role", "profilePicture"];

const hasConflict = async (userId, startTime, endTime, excludeMeetingId = null) => {
  const where = {
    status: { [Op.in]: ["pending", "accepted"] },
    [Op.or]: [{ requesterId: userId }, { recipientId: userId }],
    startTime: { [Op.lt]: endTime },
    endTime: { [Op.gt]: startTime },
  };

  if (excludeMeetingId) {
    where.id = { [Op.ne]: excludeMeetingId };
  }

  const conflict = await Meeting.findOne({ where });
  return conflict;
};

// @route  POST /api/meetings
export const createMeeting = async (req, res) => {
  try {
    const { recipientId, title, description, startTime, endTime } = req.body;
    const requesterId = req.user.id;

    if (!recipientId || !title || !startTime || !endTime) {
      return res.status(400).json({
        message: "recipientId, title, startTime, and endTime are required",
      });
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: "startTime must be before endTime" });
    }

    if (Number(recipientId) === requesterId) {
      return res.status(400).json({ message: "You cannot schedule a meeting with yourself" });
    }

    const recipient = await User.findByPk(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient user not found" });
    }

    const requesterConflict = await hasConflict(requesterId, startTime, endTime);
    if (requesterConflict) {
      return res.status(409).json({ message: "You already have a meeting during this time slot" });
    }

    const recipientConflict = await hasConflict(recipientId, startTime, endTime);
    if (recipientConflict) {
      return res.status(409).json({ message: "The recipient already has a meeting during this time slot" });
    }

    const meeting = await Meeting.create({
      requesterId,
      recipientId,
      title,
      description,
      startTime,
      endTime,
      status: "pending",
    });

    // Notify the recipient in real-time, if they're currently connected
    const io = req.app.get("io");
    const targetSocketId = io.userSocketMap?.get(String(recipientId));
    if (targetSocketId) {
      io.to(targetSocketId).emit("new-meeting-request", meeting);
    }

    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/meetings
export const getMyMeetings = async (req, res) => {
  try {
    const userId = req.user.id;

    const meetings = await Meeting.findAll({
      where: {
        [Op.or]: [{ requesterId: userId }, { recipientId: userId }],
      },
      include: [
        { model: User, as: "requester", attributes: userPublicFields },
        { model: User, as: "recipient", attributes: userPublicFields },
      ],
      order: [["startTime", "ASC"]],
    });

    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/meetings/:id/accept
export const acceptMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByPk(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (meeting.recipientId !== req.user.id) {
      return res.status(403).json({ message: "Only the recipient can accept this meeting" });
    }

    if (meeting.status !== "pending") {
      return res.status(400).json({ message: `Meeting is already ${meeting.status}` });
    }

    const conflict = await hasConflict(meeting.recipientId, meeting.startTime, meeting.endTime, meeting.id);
    if (conflict) {
      return res.status(409).json({ message: "You now have a conflicting meeting, cannot accept" });
    }

    meeting.status = "accepted";
    await meeting.save();

    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/meetings/:id/reject
export const rejectMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByPk(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (meeting.recipientId !== req.user.id) {
      return res.status(403).json({ message: "Only the recipient can reject this meeting" });
    }

    if (meeting.status !== "pending") {
      return res.status(400).json({ message: `Meeting is already ${meeting.status}` });
    }

    meeting.status = "rejected";
    await meeting.save();

    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  DELETE /api/meetings/:id
export const cancelMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByPk(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (meeting.requesterId !== req.user.id && meeting.recipientId !== req.user.id) {
      return res.status(403).json({ message: "You are not part of this meeting" });
    }

    meeting.status = "cancelled";
    await meeting.save();

    res.json({ message: "Meeting cancelled", meeting });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};