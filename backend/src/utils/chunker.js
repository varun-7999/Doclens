/**
 * @typedef {Object} ChunkOptions
 * @property {number} [chunkSize=500] Maximum number of words in a chunk.
 * @property {number} [overlap=100] Number of words repeated between chunks.
 */

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_OVERLAP = 100;
const SEPARATORS = ['\n\n', '\n', '. ', '! ', '? ', ' '];

/**
 * Splits text into bounded, overlapping chunks by progressively using less
 * specific separators when a section is larger than the target size.
 *
 * @param {string} text
 * @param {ChunkOptions} [options]
 * @returns {string[]}
 */
export function recursiveChunkText(
  text,
  { chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP } = {}
) {
  if (typeof text !== 'string' || text.trim().length === 0) return [];
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new TypeError('chunkSize must be a positive integer');
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new TypeError('overlap must be an integer from 0 to chunkSize - 1');
  }

  const words = splitRecursively(text.trim(), 0, chunkSize);
  const chunks = [];
  const step = chunkSize - overlap;

  for (let start = 0; start < words.length; start += step) {
    const chunk = words.slice(start, start + chunkSize).join(' ').trim();
    if (chunk) chunks.push(chunk);
    if (start + chunkSize >= words.length) break;
  }

  return chunks;
}

/**
 * @param {string} text
 * @param {number} separatorIndex
 * @param {number} chunkSize
 * @returns {string[]}
 */
function splitRecursively(text, separatorIndex, chunkSize) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= chunkSize) return words;

  const separator = SEPARATORS[separatorIndex];
  if (!separator) return words;

  const sections = text.split(separator).map((section) => section.trim()).filter(Boolean);
  if (sections.length <= 1) return splitRecursively(text, separatorIndex + 1, chunkSize);

  const result = [];
  let current = [];
  for (const section of sections) {
    const sectionWords = splitRecursively(section, separatorIndex + 1, chunkSize);
    for (const part of sectionWords) {
      const partWords = Array.isArray(part) ? part : [part];
      if (current.length + partWords.length > chunkSize && current.length > 0) {
        result.push(...current);
        current = [];
      }
      current.push(...partWords);
    }
  }
  if (current.length > 0) result.push(...current);
  return result;
}

export default recursiveChunkText;