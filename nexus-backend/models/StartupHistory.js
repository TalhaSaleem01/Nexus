import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// One row per past startup an entrepreneur has worked on
const StartupHistory = sequelize.define(
  "StartupHistory",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: "" },
    stage: { type: DataTypes.STRING, defaultValue: "" }, // idea, MVP, funded, growth
    year: { type: DataTypes.INTEGER, allowNull: true },
  },
  { timestamps: true }
);

export default StartupHistory;