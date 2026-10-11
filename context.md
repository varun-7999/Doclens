# Project Context: DocuLens AI (Enterprise Document RAG)

## 1. Goal & Architecture
A full-stack enterprise document intelligence portal. Users upload PDFs/documents, which are parsed, tokenized, and converted into embeddings. Users can ask questions in natural language, and the system retrieves relevant chunks via vector search and streams a grounded, cited response back to the React UI.

## 2. Tech Stack & Environment
- **Frontend:** React (Vite), Tailwind CSS, Lucide-react (for icons), Fetch API with EventSource/ReadableStream (for SSE streaming).
- **Backend:** Node.js , Express.js, `multer` (file upload).
- **Document Processing:** `pdf-parse` (text extraction), custom recursive chunking function (~700 tokens, 100 token overlap).
- **Database & Search:** MongoDB Atlas Vector Search (using native `mongodb` Node.js driver and `$vectorSearch` aggregation pipeline).
- **AI Models:** 
  - Embeddings: `@google/genai` (`text-embedding-004`, 768 dimensions)
  - Generative LLM: `@google/genai` (`gemini-1.5-flash` or `gemini-2.5-flash` with streaming)

## 3. Engineering Constraints & Rules
- Do NOT introduce Python, LangChain, or extraneous heavy wrappers unless explicitly requested. Use native Node.js and official SDKs.
- Always include robust error handling (`try/catch`), clean HTTP status codes, and input validation.
- Every RAG output must ground itself in provided context and support source page citations.
- Keep frontend components modular and functional with clean React hooks (`useState`, `useEffect`, `useRef`).