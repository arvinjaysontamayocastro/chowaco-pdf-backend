const pdfParse = require('pdf-parse');
const { generateEmbeddings } = require('./embeddingService');
const store = require('../adapters/documentStore');
const {
  getQuestionEmbedding,
  questionQueries,
} = require('../utils/extractText');
const { searchChunks, searchWithScores, askGPT } = require('../utils/rag');
const rag = require('../utils/rag');
const { validateSection } = require('../schemas/answerSchemas');
const { parseQuantity } = require('../utils/quantity');
const { parsePDF } = require('../utils/pdfUtils');
const { ocrPdfBuffer } = require('../utils/ocr');

function isAdminOrToc(paragraph) {
  if (!paragraph) return false;
  const t = String(paragraph).toLowerCase();
  return (
    t.startsWith('table of contents') ||
    t.includes('appendix') ||
    t.includes('copyright') ||
    t.includes('disclaimer')
  );
}

async function processPDFAndStore(guid, pdfBuffer) {
  const OCR = String(process.env.OCR_ENABLED || '').toLowerCase() === 'true';
  const OCR_THRESHOLD = Number(process.env.OCR_MIN_TEXT || 500); // if parsed text shorter than this, try OCR
  let text = await parsePDF(pdfBuffer);
  if (OCR && (!text || text.length < OCR_THRESHOLD)) {
    try {
      const ocrText = await ocrPdfBuffer(pdfBuffer);
      if (ocrText && ocrText.length > (text || '').length) text = ocrText;
    } catch (e) {
      console.warn('OCR fallback failed', e?.message);
    }
  }

  const { chunks, embeddings } = await generateEmbeddings(text);

  console.log('guid', guid);
  console.log('chunks', chunks);
  console.log('embeddings', embeddings);

  await store.saveDocument(guid, chunks, embeddings);

  return { chunksCount: chunks.length };
}

async function getAnswerForGuid(guid, key) {
  const doc = await store.getDocument(guid);
  if (!doc) throw new Error('Document not found');
  const chunks = doc.chunks;
  const embeddings = doc.embeddings;
  const questionEmbedding = await (rag.buildQuestionEmbedding
    ? rag.buildQuestionEmbedding(key, questionQueries[key])
    : getQuestionEmbedding(key));
  const { chunks: topChunks, sims } = searchWithScores(
    questionEmbedding,
    embeddings,
    chunks
  );

  // Filter admin/toc-like items
  const filtered = topChunks.filter((c) => !isAdminOrToc(c));

  // Build sources with index + snippet
  const sources = filtered.map((t) => ({
    snippet: t.slice(0, 400),
    index: chunks.indexOf(t),
  }));

  let answer = await askGPT(questionQueries[key], filtered, key);

  // Post-validate/coerce section arrays where applicable
  if (Array.isArray(answer)) {
    answer = validateSection(key, answer);
  }

  // Light numeric normalization example for pollutants
  if (key === 'pollutants' && Array.isArray(answer)) {
    answer = answer.map((p) => {
      if (p && typeof p.concentration === 'string' && !p.unit) {
        const q = parseQuantity(p.concentration);
        if (q && q.unit && !p.unit) return { ...p, unit: q.unit };
      }
      return p;
    });
  }

  // Confidence calculation (fallback if sims missing)
  function confidenceFromSims(sims) {
    if (!Array.isArray(sims) || sims.length === 0) return 0;
    // Normalize scores (cosine ~[-1,1] -> clamp to [0,1])
    const clamp = (x) => Math.max(0, Math.min(1, (x + 1) / 2));
    const vals = sims.map((s) => clamp(s.score));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const maxv = Math.max(...vals);
    // Weight mean and max to reward both breadth and peak relevance
    return Number((0.6 * mean + 0.4 * maxv).toFixed(2));
  }

  const _sims =
    typeof sims !== 'undefined' && sims
      ? sims
      : (embeddings || []).map((emb, i) => {
          let score = 0;
          try {
            const len = Math.min(
              (questionEmbedding || []).length,
              (emb || []).length
            );
            for (let k = 0; k < len; k++)
              score += questionEmbedding[k] * emb[k];
          } catch {}
          return { i, score };
        });
  const confidence = confidenceFromSims(_sims);

  if (Array.isArray(answer)) {
    answer = validateSection(key, answer);
  }
  return { answer, sources, confidence };
}

async function deleteDocumentsByGuid(guid) {
  return await store.deleteDocument(guid);
}

module.exports = {
  processPDFAndStore,
  getAnswerForGuid,
  deleteDocumentsByGuid,
};
