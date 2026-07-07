import fs from "fs";
import { Document, User } from "../models/associations.js";

// @route  POST /api/documents/upload
// @desc   Upload a new document
export const uploadNewDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { title } = req.body;

    const document = await Document.create({
      title: title || req.file.originalname,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/documents
// @desc   Get all documents uploaded by the logged-in user
export const getMyDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { uploadedBy: req.user.id },
      include: [{ model: User, as: "uploader", attributes: ["id", "name", "role"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/documents/:id
// @desc   Get a single document's metadata
export const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id, {
      include: [{ model: User, as: "uploader", attributes: ["id", "name", "role"] }],
    });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  GET /api/documents/:id/download
// @desc   Download/view the actual file
export const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    res.sendFile(document.filePath, { root: "." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  PUT /api/documents/:id/status
// @desc   Update document status (approve/reject)
export const updateDocumentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const document = await Document.findByPk(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    document.status = status;
    await document.save();

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  POST /api/documents/:id/sign
// @desc   Attach an e-signature image to a document
export const signDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No signature image uploaded" });
    }

    const document = await Document.findByPk(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    document.signaturePath = req.file.path;
    document.signedAt = new Date();
    await document.save();

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @route  DELETE /api/documents/:id
// @desc   Delete a document (only the uploader can delete)
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.uploadedBy !== req.user.id) {
      return res.status(403).json({ message: "Only the uploader can delete this document" });
    }

    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await document.destroy();
    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};