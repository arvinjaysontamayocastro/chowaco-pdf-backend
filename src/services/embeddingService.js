const { getEmbeddings } = require('../utils/rag');

async function generateEmbeddings(text) {
  return await getEmbeddings(text);
}

module.exports = { generateEmbeddings };
