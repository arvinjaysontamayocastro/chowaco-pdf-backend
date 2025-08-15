const pdfParse = require('pdf-parse');

/**
 * Parse PDF and return normalized text + lightweight layout hints.
 * NOTE: For OCR of scanned PDFs, integrate tesseract or a rasterizer; here we flag low text density.
 */
async function parsePDF(input) {
  if (!Buffer.isBuffer(input)) {
    throw new Error('parsePDF expects a Buffer (got non-buffer).');
  }
  const data = await pdfParse(input);
  const raw = data.text || "";
  const numpages = data.numpages || 0;

  // Split into lines and paragraphs
  const lines = raw.split(/\r?\n/).map(s => s.trim());
  const paragraphs = [];
  let acc = [];
  for (const l of lines) {
    if (l === "") {
      if (acc.length) {
        paragraphs.push(acc.join(" ").trim());
        acc = [];
      }
    } else {
      acc.push(l);
    }
  }
  if (acc.length) paragraphs.push(acc.join(" ").trim());

  // Lightweight layout hints
  const headings = [];
  const bullets = [];
  const tables = [];
  const paraMeta = [];

  const headingRe = /^([A-Z0-9][A-Z0-9\s\-:]{4,})$/; // crude ALLCAPS/section-like
  const bulletRe = /^(\d+\.\s+|[•\-–]\s+)/;
  const tableLikeRe = /(\s{2,}\S+\s{2,}\S+)|(\S+\s*\|\s*\S+)/; // columns or pipes

  paragraphs.forEach((p, idx) => {
    const isHeading = headingRe.test(p);
    const isBullet = bulletRe.test(p);
    const isTable = tableLikeRe.test(p);
    if (isHeading) headings.push(idx);
    if (isBullet) bullets.push(idx);
    if (isTable) tables.push(idx);
    paraMeta.push({ index: idx, isHeading, isBullet, isTable });
  });

  // Flag for potential OCR need
  const needsOCR = raw.trim().length < 200 && numpages > 0;

  return {
    text: raw,
    numpages,
    paragraphs,
    paraMeta,
    headings,
    bullets,
    tables,
    needsOCR,
  };
}

module.exports = { parsePDF };
