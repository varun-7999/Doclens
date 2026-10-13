# DocuLens AI

DocuLens AI is an enterprise document question-answering portal built with React, Express, MongoDB Atlas Vector Search, and Google Gemini.

## Features

- PDF upload and page-aware text extraction
- Recursive text chunking with page and chunk metadata
- Google embeddings with MongoDB Atlas Vector Search
- Grounded Gemini answers with inline source citations
- Server-Sent Events token streaming
- Evidence-grade retrieval metadata
- Original PDF storage through MongoDB GridFS
- Dark charcoal and warm metallic rose React interface

## Project structure

```text
backend/    Express API, ingestion, retrieval, Gemini generation
frontend/   React/Vite/Tailwind user interface
```

## Local setup

### Backend

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
```

Set these values in `backend/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB=doculens
GOOGLE_API_KEY=your_google_api_key
MONGODB_VECTOR_INDEX=vector_index
RAG_RESULT_LIMIT=5
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
```

Create a MongoDB Atlas Vector Search index named `vector_index` on `chunks.embedding` with 768 dimensions and cosine similarity.

Start the backend:

```powershell
npm.cmd run dev
```

### Frontend

Open a second terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`.

## API

```text
GET  /api/health
GET  /api/documents
POST /api/documents
GET  /api/documents/:id/file
DELETE /api/documents/:id
POST /api/query
POST /api/query/stream
```

## Security

Never commit `.env` files, API keys, MongoDB credentials, or uploaded documents. Use `.env.example` as the configuration template. Rotate any credential that has been exposed.
