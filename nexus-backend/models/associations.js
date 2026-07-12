import User from "./User.js";
import StartupHistory from "./StartupHistory.js";
import InvestmentHistory from "./InvestmentHistory.js";
import Meeting from "./Meeting.js";
import Document from "./Document.js";
import ChatMessage from "./ChatMessage.js";

User.hasMany(StartupHistory, {
  foreignKey: "userId",
  as: "startupHistory",
  onDelete: "CASCADE",
});
StartupHistory.belongsTo(User, { foreignKey: "userId" });

User.hasMany(InvestmentHistory, {
  foreignKey: "userId",
  as: "investmentHistory",
  onDelete: "CASCADE",
});
InvestmentHistory.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Meeting, { foreignKey: "requesterId", as: "meetingsSent" });
User.hasMany(Meeting, { foreignKey: "recipientId", as: "meetingsReceived" });
Meeting.belongsTo(User, { foreignKey: "requesterId", as: "requester" });
Meeting.belongsTo(User, { foreignKey: "recipientId", as: "recipient" });

User.hasMany(Document, { foreignKey: "uploadedBy", as: "documents" });
Document.belongsTo(User, { foreignKey: "uploadedBy", as: "uploader" });

// Chat messages: sender -> receiver
User.hasMany(ChatMessage, { foreignKey: "senderId", as: "sentMessages" });
User.hasMany(ChatMessage, { foreignKey: "receiverId", as: "receivedMessages" });
ChatMessage.belongsTo(User, { foreignKey: "senderId", as: "sender" });
ChatMessage.belongsTo(User, { foreignKey: "receiverId", as: "receiver" });

export { User, StartupHistory, InvestmentHistory, Meeting, Document, ChatMessage };