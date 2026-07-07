import User from "./User.js";
import StartupHistory from "./StartupHistory.js";
import InvestmentHistory from "./InvestmentHistory.js";
import Meeting from "./Meeting.js";
import Document from "./Document.js";

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

// Documents: uploaded by a user
User.hasMany(Document, { foreignKey: "uploadedBy", as: "documents" });
Document.belongsTo(User, { foreignKey: "uploadedBy", as: "uploader" });

export { User, StartupHistory, InvestmentHistory, Meeting, Document };