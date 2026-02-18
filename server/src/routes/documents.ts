import { Router } from 'express';
import { listDocuments, deleteDocument } from '../services/ragService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const documents = await listDocuments();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteDocument(id);
    if (success) {
      res.json({ message: 'Document deleted successfully' });
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;