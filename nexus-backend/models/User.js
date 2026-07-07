import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM("investor", "entrepreneur"),
      allowNull: false,
    },
    bio: { type: DataTypes.TEXT, defaultValue: "" },
    profilePicture: { type: DataTypes.STRING, defaultValue: "" },
    location: { type: DataTypes.STRING, defaultValue: "" },

    // Investor-only preferences (kept simple as flat columns)
    preferredSectors: { type: DataTypes.STRING, defaultValue: "" }, // comma-separated e.g. "Fintech,HealthTech"
    minTicketSize: { type: DataTypes.FLOAT, allowNull: true },
    maxTicketSize: { type: DataTypes.FLOAT, allowNull: true },
  },
  { timestamps: true }
);

export default User;