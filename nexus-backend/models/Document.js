import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Document = sequelize.define(
  "Document",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    originalName: { type: DataTypes.STRING, allowNull: false }, // original uploaded filename
    filePath: { type: DataTypes.STRING, allowNull: false }, // where it's stored on disk
    fileType: { type: DataTypes.STRING, allowNull: false }, // e.g. application/pdf
    fileSize: { type: DataTypes.INTEGER, allowNull: true }, // bytes
    version: { type: DataTypes.INTEGER, defaultValue: 1 },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
    signaturePath: { type: DataTypes.STRING, allowNull: true }, // path to signature image, if signed
    signedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { timestamps: true }
);

export default Document;