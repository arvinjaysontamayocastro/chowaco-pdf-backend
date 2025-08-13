const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // ADD (top): small helper
function coerceStrictJSON(str, key) {
  try {
    const j = JSON.parse(str);
    // normalize common mistakes like "goal" -> "goals"
    const map = { goal: 'goals', bmp: 'bmps', pollutant: 'pollutants' };
    if (!j[key]) {
      for (const k of Object.keys(map)) {
        if (j[k]) {
          j[map[k]] = j[k];
          delete j[k];
        }
      }
    }
    // ensure right shape
    return JSON.stringify({ [key]: j[key] ?? [] });
  } catch {
    // naive brace slice fallback
    const s = str.indexOf('{');
    const e = str.lastIndexOf('}');
    if (s >= 0 && e > s) {
      try {
        const j = JSON.parse(str.slice(s, e + 1));
        return JSON.stringify({ [key]: j[key] ?? j?.[key.slice(0, -1)] ?? [] });
      } catch {}
    }
    return JSON.stringify({ [key]: [] });
  }
}

const chunkText = (text, maxLength = 500) => {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];

  let currentChunk = '';
  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk += '\n' + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return chunks;
};

const getEmbeddings = async (text) => {
  const chunks = chunkText(text);
  const embeddings = [];
  for (const chunk of chunks) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
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

async function askGPT(question, context, key) {
  const prompt = `
You are extracting data for the "${key}" section from a watershed plan.
Return ONLY strict JSON, with this exact top-level shape:

{ "${key}": <array or object exactly as required by the spec> }

No explanations, no markdown, no comments.

Context:
${context.join('\n\n')}

Question:
${question}
  `.trim();

  const chat = await openai.chat.completions.create({
    model: process.env.AI_MODEL, // e.g. "gpt-4.1"
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });

  const raw = chat.choices?.[0]?.message?.content ?? '';
  // Coerce to the exact JSON shape the UI expects
  return coerceStrictJSON(raw, key);
}

module.exports = { getEmbeddings, searchChunks, askGPT };
