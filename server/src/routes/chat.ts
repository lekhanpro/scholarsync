import { Router } from 'express';
import { handleChat, handleCompare } from '../controllers/chatController.js';

const router = Router();

router.post('/', handleChat);
router.post('/compare', handleCompare);

export default router;