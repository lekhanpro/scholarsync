import { Request, Response } from 'express';
import { processPDF, getUploadsDir } from '../services/ragService.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export async function handleUpload(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const file = req.file;

    if (file.mimetype !== 'application/pdf') {
      res.status(400).json({ error: 'Only PDF files are supported' });
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      res.status(400).json({ error: 'File size exceeds 50MB limit' });
      return;
    }

    const uploadsDir = getUploadsDir();
    const filePath = join(uploadsDir, file.filename);
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const result = await processPDF(filePath, originalName);

    if (result.status === 'error') {
      res.status(422).json({
        error: 'Failed to process PDF',
        details: result.error,
        documentId: result.documentId
      });
      return;
    }

    res.status(200).json({
      message: 'PDF processed successfully',
      document: {
        id: result.documentId,
        fileName: result.fileName,
        totalChunks: result.totalChunks,
        totalPages: result.totalPages,
        status: result.status
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

export async function handleMultipleUpload(req: Request, res: Response): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const uploadsDir = getUploadsDir();
    const results = [];

    for (const file of files) {
      if (file.mimetype !== 'application/pdf') {
        results.push({
          originalName: file.originalname,
          status: 'error',
          error: 'Only PDF files are supported'
        });
        continue;
      }

      const filePath = join(uploadsDir, file.filename);
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      const result = await processPDF(filePath, originalName);
      results.push({
        originalName,
        documentId: result.documentId,
        totalChunks: result.totalChunks,
        totalPages: result.totalPages,
        status: result.status,
        error: result.error
      });
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    res.status(200).json({
      message: `Processed ${successCount} files successfully, ${errorCount} failed`,
      results
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      error: 'Failed to process uploads',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}