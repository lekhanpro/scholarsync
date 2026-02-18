import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}.pdf`;
    cb(null, uniqueName);
  }
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

const limits = {
  fileSize: 50 * 1024 * 1024,
  files: 10
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits
});

export const singleUpload = uploadMiddleware.single('file');
export const multipleUpload = uploadMiddleware.array('files', 10);