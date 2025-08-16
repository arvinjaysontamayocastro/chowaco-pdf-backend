// src/utils/rerank.js
// MMR reranking to reduce redundancy and improve coverage
// Dev-only: Keep simple. Never include this logging in production.
function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length && i < b.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * mmr
 * @param {number[]} queryEmbedding
 * @param {{chunk: string, embedding: number[]}[]} items
 * @param {number} k  number of items to select
 * @param {number} lambda  tradeoff between relevance and diversity [0..1]
 */
function mmr(queryEmbedding, items, k = 8, lambda = 0.7) {
  const selected = [];
  const candidates = items.map((it, i) => ({ ...it, i }));
  while (selected.length < Math.min(k, candidates.length)) {
    let best = null;
    let bestScore = -Infinity;
    for (const c of candidates) {
      const rel = cosine(queryEmbedding, c.embedding);
      let div = 0;
      for (const s of selected) div = Math.max(div, cosine(c.embedding, s.embedding));
      const score = lambda * rel - (1 - lambda) * div;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    selected.push(best);
    const idx = candidates.findIndex(x => x.i === best.i);
    candidates.splice(idx, 1);
  }
  return selected;
}

module.exports = { mmr };
