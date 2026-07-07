import express from "express";
import { protect } from "../middleware/auth.js";
import { uploadDocument, uploadSignature } from "../middleware/upload.js";
import {
  uploadNewDocument,
  getMyDocuments,
  getDocumentById,
  downloadDocument,
  updateDocumentStatus,
  signDocument,
  deleteDocument,
} from "../controllers/documentController.js";

const router = express.Router();

router.post("/upload", protect, uploadDocument.single("file"), uploadNewDocument);
router.get("/", protect, getMyDocuments);
router.get("/:id", protect, getDocumentById);
router.get("/:id/download", protect, downloadDocument);
router.put("/:id/status", protect, updateDocumentStatus);
router.post("/:id/sign", protect, uploadSignature.single("signature"), signDocument);
router.delete("/:id", protect, deleteDocument);

export default router;