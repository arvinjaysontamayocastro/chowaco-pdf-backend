// backend/lib/pipeline.js
// Demo pipeline that simulates progress. Replace with real PDF/OCR/LLM pipeline.

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function simulatePipeline(onProgress) {
  const steps = [15, 40, 65, 85, 95];
  for (const p of steps) {
    await wait(500); // simulate work
    await onProgress(p);
  }
  await wait(300);
}

module.exports = { simulatePipeline };
