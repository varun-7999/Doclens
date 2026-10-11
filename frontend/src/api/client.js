const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}

export function uploadDocument(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/documents`);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () => {
      try {
        const body = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body.error || `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error('The server returned an invalid upload response'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error while uploading document')));
    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

export const deleteDocument = (id) => request(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const listDocuments = () => request('/api/documents');
export const listSessions = () => request('/api/sessions');
export const getSession = (id) => request(`/api/sessions/${encodeURIComponent(id)}`);
export const deleteSession = (id) => request(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });

function parseSseBlock(block) {
  const data = block.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
  if (!data) return null;
  try { return JSON.parse(data); } catch { throw new Error('Received malformed streaming data'); }
}

export async function streamQuery({ question, documentId, signal, onEvent, timeoutMs = 60000 }) {
  const timeoutController = new AbortController();
  const abortRequest = () => timeoutController.abort(signal?.reason);
  const timeoutId = setTimeout(() => timeoutController.abort(new Error('The answer stream timed out')), timeoutMs);
  signal?.addEventListener('abort', abortRequest, { once: true });

  const response = await fetch(`${API_BASE}/api/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ question, ...(documentId ? { documentId } : {}) }),
    signal: timeoutController.signal
  });
  try {
    if (!response.ok) {
      let message = `Query failed (${response.status})`;
      try { message = (await response.json()).error || message; } catch { /* non-json response */ }
      throw new Error(message);
    }
    if (!response.body) throw new Error('The browser does not support streaming responses');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || '';
      for (const block of blocks) {
        const event = parseSseBlock(block);
        if (event) onEvent(event);
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const event = parseSseBlock(buffer);
      if (event) onEvent(event);
    }
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortRequest);
  }
}
