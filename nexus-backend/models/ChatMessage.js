import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatMessage = sequelize.define(
  "ChatMessage",
  {
    content: { type: DataTypes.TEXT, allowNull: false },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { timestamps: true }
);

export default ChatMessage;