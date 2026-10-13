import multer from 'multer';
import { ObjectId } from 'mongodb';
import recursiveChunkText from '../utils/chunker.js';
import { extractPages } from '../utils/pdfExtractor.js';
import { generateEmbedding } from '../services/embeddingService.js';
import { getDatabase } from '../services/databaseService.js';
import { deletePdf, openPdfStream, pdfExists, storePdf } from '../services/fileStorageService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, file.mimetype === 'application/pdf');
  }
});

/**
 * Chunk each page independently so every chunk keeps the page it came from.
 *
 * @param {string[]} pages
 * @returns {{ content: string, page: number, chunkIndex: number }[]}
 */
function chunkPages(pages) {
  const chunks = [];
  pages.forEach((pageText, pageIndex) => {
    for (const content of recursiveChunkText(pageText)) {
      chunks.push({ content, page: pageIndex + 1, chunkIndex: chunks.length });
    }
  });
  return chunks;
}

/**
 * Upload, parse, chunk, embed, and persist a PDF document.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function uploadDocument(req, res) {
  let stage = 'validating upload';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A PDF file is required' });
    }

    stage = 'extracting PDF text';
    let extracted;
    try {
      extracted = await extractPages(req.file.buffer);
    } catch (error) {
      console.error('PDF extraction failed:', error);
      return res.status(422).json({
        error: 'The uploaded file is not a valid or readable PDF'
      });
    }
    const { pageCount, pages } = extracted;
    const chunks = chunkPages(pages);
    if (chunks.length === 0) {
      return res.status(422).json({ error: 'The PDF did not contain extractable text' });
    }

    stage = 'generating embeddings';
    const embeddings = await Promise.all(chunks.map((chunk) => generateEmbedding(chunk.content)));
    chunks.forEach((chunk, index) => { chunk.embedding = embeddings[index]; });

    stage = 'connecting to MongoDB';
    const db = await getDatabase();
    const documents = db.collection('documents');
    const chunkCollection = db.collection('chunks');
    const createdAt = new Date();

    // Keep the original file so citations can open the real page later.
    stage = 'storing original PDF';
    const fileId = await storePdf(req.file.buffer, req.file.originalname);

    const document = {
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      pageCount,
      chunkCount: chunks.length,
      fileId,
      createdAt
    };

    let documentResult;
    stage = 'saving document metadata';
    try {
      documentResult = await documents.insertOne(document);
    } catch (error) {
      await deletePdf(fileId);
      throw error;
    }

    stage = 'saving document chunks';
    try {
      await chunkCollection.insertMany(chunks.map((chunk) => ({
        documentId: documentResult.insertedId,
        content: chunk.content,
        embedding: chunk.embedding,
        page: chunk.page,
        chunkIndex: chunk.chunkIndex,
        createdAt
      })));
    } catch (error) {
      await documents.deleteOne({ _id: documentResult.insertedId });
      await deletePdf(fileId);
      throw error;
    }

    return res.status(201).json({
      documentId: documentResult.insertedId,
      filename: document.filename,
      pageCount: document.pageCount,
      chunkCount: document.chunkCount
    });
  } catch (error) {
    const status = Number(error?.status || error?.code);
    const providerUnavailable = [429, 500, 502, 503, 504].includes(status);
    console.error(`Document ingestion failed during ${stage}:`, error);
    return res.status(500).json({
      error: providerUnavailable
        ? 'The embedding service is temporarily unavailable. Please try again shortly.'
        : `Failed to process document while ${stage}`
    });
  }
}

export { upload };

/**
 * List every ingested document with its metadata, newest first.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export async function listDocuments(_req, res) {
  try {
    const db = await getDatabase();
    const documents = await db
      .collection('documents')
      .find({}, { projection: { filename: 1, mimeType: 1, size: 1, pageCount: 1, chunkCount: 1, fileId: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(documents.map(({ _id, fileId, ...rest }) => ({
      documentId: _id,
      _id,
      ...rest,
      // Old uploads (before file storage) have no original PDF to reopen.
      hasFile: Boolean(fileId)
    })));
  } catch (error) {
    console.error('Document listing failed:', error);
    return res.status(500).json({ error: 'Failed to list documents' });
  }
}

/**
 * Stream the original PDF inline so the UI can open the cited page.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getDocumentFile(req, res) {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'id must be a valid MongoDB ObjectId' });
    }

    const db = await getDatabase();
    const document = await db
      .collection('documents')
      .findOne({ _id: new ObjectId(id) }, { projection: { filename: 1, mimeType: 1, fileId: 1 } });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (!document.fileId || !(await pdfExists(document.fileId))) {
      return res.status(404).json({ error: 'The original file is not available for this document' });
    }

    res.setHeader('Content-Type', document.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(document.filename || 'document.pdf')}`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = await openPdfStream(document.fileId);
    stream.on('error', (error) => {
      console.error('Streaming document file failed:', error);
      if (res.headersSent) res.destroy(error);
      else res.status(500).json({ error: 'Failed to stream document file' });
    });
    stream.pipe(res);
    return undefined;
  } catch (error) {
    console.error('Document file retrieval failed:', error);
    if (res.headersSent) return undefined;
    return res.status(500).json({ error: 'Failed to retrieve document file' });
  }
}

/**
 * Delete a document, every chunk that belongs to it, and the stored PDF.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'id must be a valid MongoDB ObjectId' });
    }

    const db = await getDatabase();
    const documentId = new ObjectId(id);
    const document = await db.collection('documents').findOne({ _id: documentId }, { projection: { fileId: 1 } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await db.collection('documents').deleteOne({ _id: documentId });
    await db.collection('chunks').deleteMany({ documentId });
    await deletePdf(document.fileId);

    return res.status(200).json({ documentId, deleted: true });
  } catch (error) {
    console.error('Document deletion failed:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
}