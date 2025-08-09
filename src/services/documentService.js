const pdfParse = require('pdf-parse');
const { generateEmbeddings } = require('./embeddingService');
const store = require('../adapters/documentStore');
const { getQuestionEmbedding, questionQueries } = require('../utils/extractText');
const { searchChunks, askGPT } = require('../utils/rag');
const { parsePDF } = require('../utils/pdfUtils');

async function processPDFAndStore(guid, pdfBuffer) {
  const text = await parsePDF(pdfBuffer);
  const { chunks, embeddings } = await generateEmbeddings(text);
  await store.saveDocument(guid, chunks, embeddings);
  return { chunksCount: chunks.length };
}

async function getAnswerForGuid(guid, key) {
  const doc = await store.getDocument(guid);
  if (!doc) throw new Error('Document not found');
  const chunks = doc.chunks;
  const embeddings = doc.embeddings;
  const questionEmbedding = await getQuestionEmbedding(key);
  const topChunks = searchChunks(questionEmbedding, embeddings, chunks);
  const answer = await askGPT(questionQueries[key], topChunks);
  return answer;
}

async function deleteDocumentsByGuid(guid) {
  return await store.deleteDocument(guid);
}

module.exports = { processPDFAndStore, getAnswerForGuid, deleteDocumentsByGuid };
