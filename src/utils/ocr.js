// src/utils/ocr.js
// Simple OCR fallback using tesseract.js when pdf-parse yields little/no text.
// Dev-only note: This runs in Node environment; heavy for serverless at scale.
// Guard its use via OCR_ENABLED env and a minimum text-length threshold.

const { createWorker } = require('tesseract.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fromPath } = require('pdf2pic'); // optional: quick rasterization

async function rasterizePdfToImages(pdfBuffer, dpi = 150) {
  // Writes temp pdf, then converts each page to PNG using pdf2pic
  const tmpPdf = path.join(os.tmpdir(), `ocr-${Date.now()}.pdf`);
  fs.writeFileSync(tmpPdf, pdfBuffer);
  const convert = fromPath(tmpPdf, { density: dpi, saveFilename: `page`, savePath: os.tmpdir(), format: "png" });
  // pdf2pic returns one file at a time; try first 5 pages to avoid cost
  const images = [];
  for (let i = 1; i <= 5; i++) {
    try {
      const res = await convert(i);
      if (res && res.path) images.push(res.path);
      else break;
    } catch (e) { break; }
  }
  return images;
}

async function ocrImages(imagePaths, lang = 'eng') {
  const worker = await createWorker(lang);
  let out = '';
  for (const img of imagePaths) {
    try {
      const { data: { text } } = await worker.recognize(img);
      out += '\n' + text;
    } catch {}
  }
  await worker.terminate();
  return out.trim();
}

async function ocrPdfBuffer(pdfBuffer, opts = {}) {
  const { dpi = 150, lang = 'eng' } = opts;
  const images = await rasterizePdfToImages(pdfBuffer, dpi);
  if (!images.length) return '';
  const text = await ocrImages(images, lang);
  return text;
}

module.exports = { ocrPdfBuffer };
