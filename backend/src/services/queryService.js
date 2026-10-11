import { ObjectId } from 'mongodb';
import { getDatabase } from './databaseService.js';
import { generateEmbedding } from './embeddingService.js';

const DEFAULT_VECTOR_INDEX = 'vector_index';
const DEFAULT_RESULT_LIMIT = 5;

/**
 * @typedef {Object} RetrievedChunk
 * @property {string} content
 * @property {number} chunkIndex
 * @property {number} page
 * @property {string} filename
 * @property {string} documentId
 * @property {number} score
 */

/**
 * Retrieve the chunks most similar to a question using MongoDB Atlas Vector Search.
 *
 * @param {string} question
 * @param {string} [documentId]
 * @returns {Promise<RetrievedChunk[]>}
 */
export async function retrieveRelevantChunks(question, documentId) {
  const queryEmbedding = await generateEmbedding(question);
  const vectorIndex = process.env.MONGODB_VECTOR_INDEX || DEFAULT_VECTOR_INDEX;
  const limit = Number.parseInt(process.env.RAG_RESULT_LIMIT || DEFAULT_RESULT_LIMIT, 10);
  const pipeline = [
    {
      $vectorSearch: {
        index: vectorIndex,
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: Math.max(limit * 10, 50),
        limit
      }
    },
    {
      $lookup: {
        from: 'documents',
        localField: 'documentId',
        foreignField: '_id',
        as: 'document'
      }
    },
    { $unwind: { path: '$document', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        content: 1,
        chunkIndex: 1,
        page: 1,
        documentId: 1,
        filename: '$document.filename',
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ];

  if (documentId) {
    if (!ObjectId.isValid(documentId)) throw new TypeError('documentId must be a valid MongoDB ObjectId');
    pipeline[0].$vectorSearch.filter = { documentId: new ObjectId(documentId) };
  }

  const db = await getDatabase();
  return db.collection('chunks').aggregate(pipeline).toArray();
}