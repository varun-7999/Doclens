import { Router } from 'express';
import { deleteDocument, getDocumentFile, listDocuments, upload, uploadDocument } from '../controllers/documentController.js';

const router = Router();

router.get('/', listDocuments);
router.post('/', upload.single('file'), uploadDocument);
router.get('/:id/file', getDocumentFile);
router.delete('/:id', deleteDocument);

export default router;