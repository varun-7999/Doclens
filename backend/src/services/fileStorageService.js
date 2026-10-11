import { GridFSBucket, ObjectId } from 'mongodb';
import { getDatabase } from './databaseService.js';

const BUCKET_NAME = 'pdfs';
const CONTENT_TYPE = 'application/pdf';

/**
 * Lazily create a GridFS bucket so the original PDFs can be re-served later.
 *
 * @returns {Promise<GridFSBucket>}
 */
async function getBucket() {
  const db = await getDatabase();
  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

/**
 * Persist an uploaded PDF in GridFS and return its file id.
 *
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {Promise<import('mongodb').ObjectId>}
 */
export async function storePdf(buffer, filename) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new TypeError('buffer must be a non-empty PDF buffer');
  }

  const bucket = await getBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename || 'document.pdf', {
      contentType: CONTENT_TYPE
    });
    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.on('error', reject);
    // GridFSBucketWriteStream is a Writable, so ending it with the buffer is safest.
    uploadStream.end(buffer);
  });
}

/**
 * @param {import('mongodb').ObjectId | string} fileId
 * @returns {Promise<boolean>}
 */
export async function pdfExists(fileId) {
  if (!fileId) return false;
  const bucket = await getBucket();
  const id = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
  const [found] = await bucket.find({ _id: id }).limit(1).toArray();
  return Boolean(found);
}

/**
 * Open a readable stream for a stored PDF.
 *
 * @param {import('mongodb').ObjectId} fileId
 * @returns {Promise<import('stream').Readable>}
 */
export async function openPdfStream(fileId) {
  const bucket = await getBucket();
  return bucket.openDownloadStream(typeof fileId === 'string' ? new ObjectId(fileId) : fileId);
}

/**
 * Remove a stored PDF, tolerating an already-deleted file.
 *
 * @param {import('mongodb').ObjectId} [fileId]
 * @returns {Promise<void>}
 */
export async function deletePdf(fileId) {
  if (!fileId) return;
  const bucket = await getBucket();
  const id = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
  try {
    await bucket.delete(id);
  } catch (error) {
    if (error?.code !== 'ENOENT' && error?.code !== 26) throw error;
  }
}