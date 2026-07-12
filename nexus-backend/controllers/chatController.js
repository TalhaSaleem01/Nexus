import { Op } from "sequelize";
import { ChatMessage, User } from "../models/associations.js";

// Shapes a DB message row into the { id, senderId, receiverId, content, timestamp, isRead }
// format the frontend's Message type expects (ids as strings, timestamp field name)
const formatMessage = (msg) => ({
  id: String(msg.id),
  senderId: String(msg.senderId),
  receiverId: String(msg.receiverId),
  content: msg.content,
  timestamp: msg.createdAt,
  isRead: msg.isRead,
});

// @route  GET /api/chat/conversations
// @desc   Get a list of conversations for the logged-in user (one entry per contact, with last message + real user info)
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await ChatMessage.findAll({
      where: {
        [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      },
      order: [["createdAt", "DESC"]],
    });

    const conversationMap = new Map();
    const otherUserIds = new Set();

    messages.forEach((msg) => {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      otherUserIds.add(otherUserId);
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          id: `conv-${otherUserId}`,
          participants: [String(userId), String(otherUserId)],
          lastMessage: formatMessage(msg),
        });
      }
    });

    // Fetch real user info for everyone the current user has chatted with
    const otherUsers = await User.findAll({
      where: { id: Array.from(otherUserIds) },
      attributes: ["id", "name", "profilePicture", "role"],
    });
    const userMap = new Map(otherUsers.map((u) => [u.id, u]));

    const conversations = Array.from(conversationMap.entries()).map(([otherUserId, conv]) => {
      const otherUser = userMap.get(otherUserId);
      return {
        ...conv,
        otherUser: otherUser
          ? {
              id: String(otherUser.id),
              name: otherUser.name,
              avatarUrl:
                otherUser.profilePicture ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=random`,
              role: otherUser.role,
              isOnline: false,
            }
          : null,
      };
    });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/chat/:userId
// @desc   Get all messages between the logged-in user and another user
export const getMessagesWithUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const messages = await ChatMessage.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId },
        ],
      },
      order: [["createdAt", "ASC"]],
    });

    // Mark messages sent TO the current user as read
    await ChatMessage.update(
      { isRead: true },
      { where: { senderId: otherUserId, receiverId: currentUserId, isRead: false } }
    );

    res.json(messages.map(formatMessage));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/chat
// @desc   Send a new message
export const sendChatMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ message: "receiverId and content are required" });
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const message = await ChatMessage.create({
      senderId,
      receiverId,
      content: content.trim(),
    });

    // Real-time push to the receiver, if they're online
    const io = req.app.get("io");
    const targetSocketId = io.userSocketMap?.get(String(receiverId));
    if (targetSocketId) {
      io.to(targetSocketId).emit("new-chat-message", formatMessage(message));
    }

    res.status(201).json(formatMessage(message));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};