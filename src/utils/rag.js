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

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

// -------- normalize input -> paragraphs --------
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

// -------- retrieval --------
function cosineSimilarity(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1e-12);
}

function searchChunks(
  questionEmbedding,
  documentEmbeddings,
  documentChunks,
  topK = 5
) {
  const sims = documentEmbeddings.map((emb, i) => ({
    i,
    score: cosineSimilarity(questionEmbedding, emb),
  }));
  sims.sort((a, b) => b.score - a.score);
  return sims.slice(0, topK).map((s) => documentChunks[s.i]);
}

// -------- answering --------
const askGPT = async (question, contextChunks, canonicalKey) => {
  return askWithRetry({ canonicalKey, question, context: contextChunks });
};


async function buildQuestionEmbedding(key, basePrompt){
  try {
    const hint = anchorFor ? anchorFor(key) : "";
    const q = hint ? `${basePrompt}\nHINT: ${hint}` : basePrompt;
    const emb = await getEmbeddings(q);
    return emb;
  } catch (e) {
    return await getEmbeddings(basePrompt);
  }
}

module.exports = { getEmbeddings, searchChunks, askGPT };
