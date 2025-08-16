// src/utils/rag.js
// Document embeddings + retrieval helpers used during ingestion and ask-time.
// - Accepts either raw text (string) or parsed object { text, paragraphs, ... }
// - Uses overlap chunking for better context retention
// - Provides cosine-similarity retrieval
// - Delegates final answering to askWithRetry (strict JSON enforcement elsewhere)

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { askWithRetry } = require('./llm');
const { chunkWithOverlap } = require('../utils/chunker');
const { mmr } = require('./rerank');
const { anchorFor } = require('./fieldAnchors');

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

// -------- normalize input -> paragraphs --------
async function buildQuestionEmbedding(key, basePrompt) {
  const hint = anchorFor(key);
  const q = hint ? `${basePrompt}\nHINT: ${hint}` : basePrompt;
  const emb = await getEmbeddings(q);
  return emb;
}
function toParagraphs(input) {
  if (typeof input === 'string') {
    return input.split(/\n\n+/);
  }
  if (input && Array.isArray(input.paragraphs)) {
    return input.paragraphs;
  }
  if (input && typeof input.text === 'string') {
    return input.text.split(/\n\n+/);
  }
  return String(input ?? '').split(/\n\n+/);
}

// -------- embeddings --------
async function embedBatch(
  texts,
  { model = EMBEDDING_MODEL, batchSize = 64 } = {}
) {
  const out = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const resp = await openai.embeddings.create({ model, input: batch });
    for (const item of resp.data) {
      out.push(item.embedding);
    }
  }
  return out;
}

async function getEmbeddings(textOrParsed) {
  // Build high-quality chunks from paragraphs with overlap for context
  const paragraphs = toParagraphs(textOrParsed);
  const chunks = chunkWithOverlap(paragraphs, {
    maxTokens: 900,
    overlapTokens: 180,
  });

  // Create embeddings for each chunk
  const embeddings = await embedBatch(chunks);

  return { chunks, embeddings };
}
function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function searchChunks(
  questionEmbedding,
  documentEmbeddings,
  documentChunks,
  topK = 5,
  useMMR = true
) {
  const sims = documentEmbeddings.map((emb, i) => ({
    i,
    score: cosine(questionEmbedding, emb),
  }));
  sims.sort((a, b) => b.score - a.score);
  if (useMMR) {
    const items = sims.map((s) => ({
      chunk: documentChunks[s.i],
      embedding: documentEmbeddings[s.i],
    }));
    const picked = mmr(questionEmbedding, items, topK, 0.7);
    return picked.map((p) => p.chunk);
  }
  return sims.slice(0, topK).map((s) => documentChunks[s.i]);
}

// -------- answering --------
const askGPT = async (question, contextChunks, canonicalKey) => {
  return askWithRetry({ canonicalKey, question, context: contextChunks });
};

// Return both chunks and similarity scores for confidence calculations
function searchWithScores(
  questionEmbedding,
  documentEmbeddings,
  documentChunks,
  topK = 8,
  useMMR = true
) {
  const sims = documentEmbeddings.map((emb, i) => ({
    i,
    score: cosine(questionEmbedding, emb),
  }));
  sims.sort((a, b) => b.score - a.score);
  if (useMMR) {
    const items = sims.map((s) => ({
      chunk: documentChunks[s.i],
      embedding: documentEmbeddings[s.i],
      i: s.i,
      score: s.score,
    }));
    const picked = mmr(questionEmbedding, items, topK, 0.7);
    const chunks = picked.map((p) => p.chunk);
    const scores = picked.map((p) => ({ i: p.i, score: p.score }));
    return { chunks, scores };
  }
  const top = sims.slice(0, topK);
  return { chunks: top.map((s) => documentChunks[s.i]), scores: top };
}

module.exports = {
  getEmbeddings,
  searchChunks,
  searchWithScores,
  askGPT,
  buildQuestionEmbedding,
};
