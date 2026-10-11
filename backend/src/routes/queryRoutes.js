import { Router } from 'express';
import { answerQuestion, streamAnswerQuestion } from '../controllers/queryController.js';

const router = Router();

router.post('/', answerQuestion);
router.post('/stream', streamAnswerQuestion);

export default router;