const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const chunkText = (text, maxLength = 500) => {
  // console.log("text.length", text.length);
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];

  let currentChunk = "";
  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk += "\n" + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return chunks;
};

const getEmbeddings = async (text) => {
  const chunks = chunkText(text);
  const embeddings = [];

  // console.log("process.env.OPENAI_API_KEY ", process.env.OPENAI_API_KEY);
  // console.log(JSON.stringify(chunks));
  for (const chunk of chunks) {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk,
    });
    embeddings.push(response.data[0].embedding);
  }

  return { chunks, embeddings };
};

const cosineSimilarity = (a, b) => {
  let dot = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const searchChunks = (
  questionEmbedding,
  documentEmbeddings,
  documentChunks,
  topK = 3
) => {
  const similarities = documentEmbeddings.map((emb, i) => ({
    index: i,
    score: cosineSimilarity(questionEmbedding, emb),
  }));
  similarities.sort((a, b) => b.score - a.score);
  return similarities.slice(0, topK).map((s) => documentChunks[s.index]);
};

const askGPT = async (question, context) => {
  // console.log("askGPT");
  // console.log(question);
  const prompt = `
Populate using the interface and comments, then return result in valid JSON only, remove all backticks and invalid json characters from values

${context.join(" \n\n ")}

Question: ${question}
  `;

  const chat = await openai.chat.completions.create({
    model: process.env.AI_MODEL, //"gpt-4.1"
    messages: [{ role: "user", content: prompt }],
  });

  return chat.choices[0].message.content;
};

module.exports = { getEmbeddings, searchChunks, askGPT };
