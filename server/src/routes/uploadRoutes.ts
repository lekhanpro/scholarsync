import { Router } from "express";
import multer from "multer";
import path from "path";
import { uploadPDF, getDocuments, removeDocument } from "../controllers/uploadController.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve("uploads"));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const router = Router();

router.post("/upload", upload.single("pdf"), uploadPDF);
router.get("/documents", getDocuments);
router.delete("/documents/:id", removeDocument);

export default router;