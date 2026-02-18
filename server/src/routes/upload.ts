import { Router } from 'express';
import { singleUpload, multipleUpload } from '../middleware/uploadMiddleware.js';
import { handleUpload, handleMultipleUpload } from '../controllers/uploadController.js';

const router = Router();

router.post('/single', singleUpload, handleUpload);
router.post('/multiple', multipleUpload, handleMultipleUpload);

export default router;