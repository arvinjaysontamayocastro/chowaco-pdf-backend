const pdfParse = require('pdf-parse');
const { ocrPdfBuffer } = require('./ocr');

/**
 * Parse PDF and return normalized text + lightweight layout hints.
 * If text is sparse and OCR is enabled, attempt OCR for first N pages.
 */
async function parsePDF(input) {
  if (!Buffer.isBuffer(input)) {
    throw new Error('parsePDF expects a Buffer (got non-buffer).');
  }
  const data = await pdfParse(input);
  let raw = data.text || "";
  const numpages = data.numpages || 0;

  // If very little text and OCR enabled, try OCR to recover text
  const tooSparse = raw.trim().length < 200 && numpages > 0;
  if (tooSparse) {
    try {
      const { text: ocrText } = await ocrPdfBuffer(input, { firstNPages: Math.min(numpages, 10) });
      if (ocrText && ocrText.trim().length > raw.length) {
        raw = ocrText;
      }
    } catch (e) {
      // best effort only
    }
  }

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

  // Return enriched parse
  return {
    text: raw,
    numpages,
    paragraphs,
    paraMeta,
    headings,
    bullets,
    tables,
    needsOCR: tooSparse,
  };
}

module.exports = { parsePDF };
