import { Request, Response } from "express";
import { ingestPDF, listDocuments, deleteDocument } from "../services/ragService.js";
import fs from "fs";

export async function uploadPDF(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const file = req.file;

    if (file.mimetype !== "application/pdf") {
      fs.unlinkSync(file.path);
      res.status(400).json({ error: "Only PDF files are accepted" });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      fs.unlinkSync(file.path);
      res.status(400).json({ error: "File size must be under 50MB" });
      return;
    }

    console.log(
      `[Upload] Processing: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`
    );

    const document = await ingestPDF(file.path, file.originalname);

    try { fs.unlinkSync(file.path); } catch {}

    res.status(201).json({
      message: "Document processed successfully",
      document,
    });
  } catch (error: any) {
    console.error(`[Upload] Error: ${error.message}`);
    res.status(500).json({
      error: "Failed to process PDF",
      details: error.message,
    });
  }
}

export async function getDocuments(_req: Request, res: Response): Promise<void> {
  try {
    const documents = await listDocuments();
    res.json({ documents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function removeDocument(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Document ID is required" });
      return;
    }
    await deleteDocument(id);
    res.json({ message: "Document deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}