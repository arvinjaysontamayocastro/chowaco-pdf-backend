// src/utils/llm.js
// /////////////////////////////
// LLM call wrapper: primary + retry + fallback, JSON-only
// /////////////////////////////
const { OpenAI } = require('openai');
const {
  primaryModel,
  fallbackModel,
  temperature,
  maxTokens,
} = require('../config/openai');
const { coerceStrictJSON } = require('../helpers/jsonCoerce');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Keys that should be arrays (for simple validity checks)
const ARRAY_KEYS = new Set([
  'pollutants',
  'goals',
  'bmps',
  'implementationActivities',
  'monitoringMetrics',
  'outreachActivities',
  'geographicAreas',
]);

function isValidForKey(canonicalKey, coercedText) {
  try {
    const obj = JSON.parse(coercedText);
    const val = obj?.[canonicalKey];
    if (ARRAY_KEYS.has(canonicalKey))
      return Array.isArray(val) && val.length > 0;
    if (canonicalKey === 'identity')
      return val && typeof val === 'object' && Object.keys(val).length > 0;
    if (canonicalKey === 'summary')
      return typeof val === 'string' ? val.trim().length > 0 : !!val;
    return !!val; // fallback
  } catch {
    return false;
  }
}

function buildPrompt(canonicalKey, question, context) {
  console.log('canonicalKey', canonicalKey);
  console.log('question', question);
  console.log('context', context);
  return `
You are extracting data for the "${canonicalKey}" section from a watershed plan.
Return ONLY strict JSON, with this exact top-level shape:

{ "${canonicalKey}": <array or object exactly as required by the spec> }

No explanations, no markdown, no comments.

Context:
${Array.isArray(context) ? context.join('\n\n') : String(context)}

Question:
${String(question)}
`.trim();
}

async function chatOnce(model, prompt, signal) {
  const chat = await openai.chat.completions.create({
    model,
    temperature,
    // maxTokens: maxTokens,
    response_format: { type: 'json_object' }, // JSON-only mode
    messages: [{ role: 'user', content: prompt }],
    // If your SDK version supports request timeouts or signals, the `signal` is passed by caller.
    // Some SDKs accept { signal } directly; if not, you can wrap with AbortController at the caller.
  });
  return chat.choices?.[0]?.message?.content ?? '';
}

/**
 * askWithRetry:
 *  - try primary model (up to 2 attempts)
 *  - if still invalid/empty, try fallback model (1 attempt)
 * Always returns a JSON string coerced to `{ [canonicalKey]: <expected shape> }`.
 */
async function askWithRetry({ canonicalKey, question, context, signal }) {
  const prompt = buildPrompt(canonicalKey, question, context);

  // Primary model attempts
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await chatOnce(primaryModel, prompt, signal);
    const coerced = coerceStrictJSON(raw, canonicalKey);
    if (isValidForKey(canonicalKey, coerced)) return coerced;
  }

  // Fallback attempt (expensive model)
  if (fallbackModel) {
    const raw = await chatOnce(fallbackModel, prompt, signal);
    const coerced = coerceStrictJSON(raw, canonicalKey);
    return coerced; // even if empty, we return coerced so UI keeps moving
  }

  // Last resort: empty of correct shape
  return coerceStrictJSON('{}', canonicalKey);
}

module.exports = { askWithRetry };
