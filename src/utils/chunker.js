// src/utils/chunker.js
// Overlap chunking tuned for LLM context windows.
// Uses a lightweight token estimate (~4 chars per token).

function approxTokens(str = "") {
  // Very rough heuristic: 1 token ~ 4 chars
  return Math.ceil((str || "").length / 4);
}

function chunkWithOverlap(paragraphs = [], opts = {}) {
  const {
    maxTokens = 900, // adjust based on model window
    overlapTokens = 180,
    joiner = "\n"
  } = opts;

  const chunks = [];
  let current = [];
  let currentTokens = 0;

  const flush = () => {
    if (current.length === 0) return;
    chunks.push(current.join(joiner).trim());
  };

  for (const p of paragraphs) {
    const t = approxTokens(p);
    // If a single paragraph is too big, hard-split it
    if (t > maxTokens) {
      // naive split by sentence/period
      const bits = p.split(/(?<=[.!?])\s+/);
      let acc = "";
      for (const b of bits) {
        const bt = approxTokens(b + " ");
        if (approxTokens(acc) + bt > maxTokens) {
          if (acc.trim()) chunks.push(acc.trim());
          acc = b;
        } else {
          acc += (acc ? " " : "") + b;
        }
      }
      if (acc.trim()) chunks.push(acc.trim());
      continue;
    }

    if (currentTokens + t > maxTokens) {
      // flush with overlap
      flush();
      // Start next with overlap slice from the end
      if (overlapTokens > 0 && chunks.length > 0) {
        // rebuild from the end to reach overlapTokens
        let overlap = [];
        let ot = 0;
        for (let i = current.length - 1; i >= 0; i--) {
          const pt = approxTokens(current[i]);
          if (ot + pt > overlapTokens) break;
          overlap.unshift(current[i]);
          ot += pt;
        }
        current = overlap.slice();
        currentTokens = overlap.reduce((sum, s) => sum + approxTokens(s), 0);
      } else {
        current = [];
        currentTokens = 0;
      }
    }

    current.push(p);
    currentTokens += t;
  }

  flush();
  return chunks;
}

module.exports = { chunkWithOverlap, approxTokens };
