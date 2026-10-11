import { GoogleGenAI } from '@google/genai';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;

let googleClient;

/**
 * @returns {GoogleGenAI}
 */
function getGoogleClient() {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }
  googleClient ??= new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  return googleClient;
}

/**
 * Generate a 768-dimensional embedding for a text string.
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new TypeError('text must be a non-empty string');
  }

  const response = await getGoogleClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS }
  });
  const values = response.embeddings?.[0]?.values;

  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding response did not contain ${EMBEDDING_DIMENSIONS} dimensions`);
  }

  return values;
}

export { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL };