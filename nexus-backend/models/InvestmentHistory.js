import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// One row per past investment an investor has made
const InvestmentHistory = sequelize.define(
  "InvestmentHistory",
  {
    startupName: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: true },
    year: { type: DataTypes.INTEGER, allowNull: true },
    sector: { type: DataTypes.STRING, defaultValue: "" },
  },
  { timestamps: true }
);

export default InvestmentHistory;