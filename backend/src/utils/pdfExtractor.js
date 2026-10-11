import pdfParse from 'pdf-parse';

/**
 * Mirrors pdf-parse's built-in page renderer so extracted text stays identical
 * to the previous whole-document behaviour, while letting us capture each page.
 *
 * @param {object} pageData pdf.js PDFPageProxy for a single page
 * @returns {Promise<string>}
 */
function renderPage(pageData) {
  return pageData
    .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
    .then((textContent) => {
      let lastY;
      let text = '';
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || !lastY) text += item.str;
        else text += `\n${item.str}`;
        lastY = item.transform[5];
      }
      return text;
    });
}

/**
 * Extract document text page by page so every chunk can be traced back to the
 * real PDF page it came from (the basis for evidence-grade citations).
 *
 * pdf-parse invokes `pagerender` once per page and awaits it sequentially, so
 * we index results by the page proxy's `pageNumber` (falling back to call order)
 * to stay aligned even if a single page fails to render.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{ pageCount: number, pages: string[] }>}
 */
export async function extractPages(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new TypeError('buffer must be a non-empty PDF buffer');
  }

  const rawPages = [];
  const parsed = await pdfParse(buffer, {
    pagerender: (pageData) =>
      renderPage(pageData).then((text) => {
        const index = typeof pageData?.pageNumber === 'number' ? pageData.pageNumber - 1 : rawPages.length;
        rawPages[index] = text;
        return text;
      })
  });

  const pageCount = parsed.numpages || rawPages.length;
  const pages = Array.from({ length: pageCount }, (_, index) => rawPages[index] || '');

  return { pageCount, pages };
}

export default extractPages;