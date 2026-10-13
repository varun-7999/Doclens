import { GoogleGenAI } from '@google/genai';

const DEFAULT_GENERATION_MODEL = 'gemini-2.5-flash';
const FALLBACK_GENERATION_MODEL = 'gemini-2.5-flash-lite';
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
let googleClient;

function getGoogleClient() {
  if (!process.env.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is not configured');
  googleClient ??= new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  return googleClient;
}

function getGenerationModels() {
  return [...new Set([
    process.env.GEMINI_MODEL || DEFAULT_GENERATION_MODEL,
    process.env.GEMINI_FALLBACK_MODEL || FALLBACK_GENERATION_MODEL
  ])];
}

function getStatusCode(error) {
  const status = Number(error?.status || error?.code);
  return Number.isInteger(status) ? status : undefined;
}

async function generateWithFallback(request) {
  let lastError;

  for (const model of getGenerationModels()) {
    try {
      return await request(model);
    } catch (error) {
      lastError = error;
      if (!RETRYABLE_STATUS_CODES.has(getStatusCode(error))) throw error;
      console.warn(`Gemini model ${model} is temporarily unavailable; trying the next model`);
    }
  }

  throw lastError;
}

function buildGroundedPrompt(question, chunks) {
  const context = chunks
    .map((chunk, index) => `[Source ${chunk.sourceNumber || index + 1}] ${chunk.filename || 'document'} - page ${chunk.page || 'unknown'} - chunk ${chunk.chunkIndex}\n${chunk.content}`)
    .join('\n\n');

  return `You answer questions about uploaded documents. Use only the sources below.
If the sources do not contain enough information, say you do not have enough information.
Do not invent facts. Cite every material claim inline using [Source N]. Use only source numbers provided below.
The source metadata includes a page number so the client can open the cited PDF page.

Question:
${question}

Sources:
${context}`;
}

/**
 * Generate an answer constrained to retrieved document context.
 *
 * @param {string} question
 * @param {import('./queryService.js').RetrievedChunk[]} chunks
 * @returns {Promise<string>}
 */
export async function generateGroundedAnswer(question, chunks) {
  const prompt = buildGroundedPrompt(question, chunks);

  const response = await generateWithFallback((model) =>
    getGoogleClient().models.generateContent({ model, contents: prompt })
  );
  const answer = response.text?.trim();
  if (!answer) throw new Error('The model returned an empty answer');
  return answer;
}

/**
 * Stream a grounded answer and invoke the callback for each generated text chunk.
 *
 * @param {string} question
 * @param {import('./queryService.js').RetrievedChunk[]} chunks
 * @param {(text: string) => (void|Promise<void>)} onChunk
 * @returns {Promise<void>}
 */
export async function streamGroundedAnswer(question, chunks, onChunk) {
  if (typeof onChunk !== 'function') {
    throw new TypeError('onChunk must be a function');
  }

  let lastError;
  for (const model of getGenerationModels()) {
    let emittedText = false;
    try {
      const responseStream = await getGoogleClient().models.generateContentStream({
        model,
        contents: buildGroundedPrompt(question, chunks)
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          emittedText = true;
          await onChunk(text);
        }
      }
      return;
    } catch (error) {
      lastError = error;
      if (emittedText || !RETRYABLE_STATUS_CODES.has(getStatusCode(error))) {
        throw error;
      }
      console.warn(`Gemini streaming model ${model} is temporarily unavailable; trying the next model`);
    }
  }

  // Some hosted environments or provider incidents can reject streaming while
  // regular generation remains available. Return the complete answer as one
  // chunk so the user still receives a grounded response.
  const response = await generateWithFallback((model) =>
    getGoogleClient().models.generateContent({
      model,
      contents: buildGroundedPrompt(question, chunks)
    })
  );
  const answer = response.text?.trim();
  if (!answer) throw lastError || new Error('The model returned an empty answer');
  await onChunk(answer);
}