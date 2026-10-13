import { generateGroundedAnswer, streamGroundedAnswer } from '../services/answerService.js';
import { addEvidenceMetadata } from '../services/evidenceService.js';
import { retrieveRelevantChunks } from '../services/queryService.js';

function writeSseEvent(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function getSources(chunks) {
  return chunks;
}

function getAnswerErrorMessage(error) {
  const status = Number(error?.status || error?.code);
  if (status === 429) return 'The Gemini API rate limit was reached. Please try again shortly.';
  if (status === 503) return 'Gemini is temporarily unavailable. Please try again shortly.';
  if (status === 401 || status === 403) return 'The Gemini API key is invalid or does not have permission to generate answers.';
  return error instanceof TypeError ? error.message : 'Failed to stream answer';
}

/**
 * Answer a question using retrieved document chunks.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function answerQuestion(req, res) {
  try {
    const { question, documentId } = req.body ?? {};
    if (typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'question must be a non-empty string' });
    }

    const chunks = await retrieveRelevantChunks(question.trim(), documentId);
    if (chunks.length === 0) {
      return res.status(404).json({ error: 'No relevant document context was found' });
    }

    const sources = addEvidenceMetadata(chunks);
    const answer = await generateGroundedAnswer(question.trim(), sources);
    return res.status(200).json({
      answer,
      sources: getSources(sources)
    });
  } catch (error) {
    if (error instanceof TypeError) return res.status(400).json({ error: error.message });
    console.error('Question answering failed:', error);
    return res.status(500).json({ error: 'Failed to answer question' });
  }
}

/**
 * Stream an answer using Server-Sent Events.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function streamAnswerQuestion(req, res) {
  let clientDisconnected = false;

  req.on('aborted', () => {
    clientDisconnected = true;
  });
  res.on('close', () => {
    if (!res.writableEnded) clientDisconnected = true;
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendError = (message) => {
    if (!clientDisconnected && !res.writableEnded) writeSseEvent(res, { type: 'error', message });
  };

  try {
    const { question, documentId } = req.body ?? {};
    if (typeof question !== 'string' || question.trim().length === 0) {
      sendError('question must be a non-empty string');
      return res.end();
    }

    const chunks = await retrieveRelevantChunks(question.trim(), documentId);
    if (chunks.length === 0) {
      sendError('No relevant document context was found');
      return res.end();
    }

    if (clientDisconnected) return res.end();
    const sources = addEvidenceMetadata(chunks);
    writeSseEvent(res, { type: 'sources', sources: getSources(sources) });

    await streamGroundedAnswer(question.trim(), sources, (text) => {
      if (!clientDisconnected && !res.writableEnded) {
        writeSseEvent(res, { type: 'token', content: text });
      }
    });

    if (!clientDisconnected && !res.writableEnded) {
      writeSseEvent(res, { type: 'done' });
    }
  } catch (error) {
    console.error('Streaming question answering failed:', error);
    sendError(getAnswerErrorMessage(error));
  } finally {
    if (!res.writableEnded) res.end();
  }
}