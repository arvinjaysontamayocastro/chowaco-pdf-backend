const pdfParse = require('pdf-parse');
const { generateEmbeddings } = require('./embeddingService');
const store = require('../adapters/documentStore');
const {
  getQuestionEmbedding,
  questionQueries,
} = require('../utils/extractText');
const {
  searchChunks,
  askGPT,
  buildQuestionEmbedding,
} = require('../utils/rag');
const { parsePDF } = require('../utils/pdfUtils');

async function processPDFAndStore(guid, pdfBuffer) {
  const text = await parsePDF(pdfBuffer);

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
  const questionEmbedding = await (buildQuestionEmbedding
    ? buildQuestionEmbedding(key, questionQueries[key])
    : getQuestionEmbedding(key));
  const topChunks = searchChunks(questionEmbedding, embeddings, chunks);
  // Build sources with index + snippet
  const sources = topChunks.map((t) => ({
    snippet: t.slice(0, 400),
    index: chunks.indexOf(t),
  }));
  const answer = await askGPT(questionQueries[key], topChunks, key);
  return { answer, sources };
}

async function deleteDocumentsByGuid(guid) {
  return await store.deleteDocument(guid);
}

module.exports = {
  processPDFAndStore,
  getAnswerForGuid,
  deleteDocumentsByGuid,
};
