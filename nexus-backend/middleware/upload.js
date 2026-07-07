import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directories exist
const documentsDir = "uploads/documents";
const signaturesDir = "uploads/signatures";
[documentsDir, signaturesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, documentsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, signaturesDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Only allow common document types
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Only PDF, Word docs, and images are allowed."));
  }
};

// Only allow images for signatures
const signatureFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Signature must be an image file."));
  }
};

export const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

export const uploadSignature = multer({
  storage: signatureStorage,
  fileFilter: signatureFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});