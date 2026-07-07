import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Meeting = sequelize.define(
  "Meeting",
  {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "rejected", "cancelled"),
      defaultValue: "pending",
    },
  },
  { timestamps: true }
);

export default Meeting;