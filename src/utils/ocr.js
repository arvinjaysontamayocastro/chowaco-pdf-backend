// src/utils/ocr.js
// Pluggable OCR utility with graceful fallback.
// Attempts rasterization via pdf2pic then OCR via tesseract.js if ENABLE_OCR === 'true'.
// If libraries are unavailable at runtime, we log and return null text, letting the pipeline continue.

let pdf2pic, Tesseract;
try {
  pdf2pic = require("pdf2pic");
} catch (_) {
  pdf2pic = null;
}
try {
  Tesseract = require("tesseract.js");
} catch (_) {
  Tesseract = null;
}

async function ocrPdfBuffer(pdfBuffer, { firstNPages = 5 } = {}) {
  if (process.env.ENABLE_OCR !== 'true') {
    return { text: null, reason: "OCR disabled (ENABLE_OCR != true)" };
  }
  if (!pdf2pic || !Tesseract) {
    return { text: null, reason: "OCR libs not available at runtime" };
  }

  // Render pages to images in memory
  const converter = pdf2pic.fromBuffer(pdfBuffer, {
    density: 144,
    format: "png",
    width: 1600,
    height: 1600,
    saveFilename: "page",
    savePath: "/tmp/pdf_ocr", // ephemeral
  });

  let outText = "";
  const limit = Math.max(1, Number(firstNPages || 5));
  for (let i = 1; i <= limit; i++) {
    try {
      const img = await converter(i, { responseType: "buffer" });
      // img is { base64: string, buffer: Buffer, page: number, name: string }
      const res = await Tesseract.recognize(img.buffer, "eng", {
        logger: () => {},
      });
      outText += "\n\n" + (res.data && res.data.text ? res.data.text : "");
    } catch (e) {
      // Stop on first hard failure
      break;
    }
  }
  if (!outText.trim()) {
    return { text: null, reason: "OCR produced empty text" };
  }
  return { text: outText, reason: "OCR success" };
}

module.exports = { ocrPdfBuffer };
