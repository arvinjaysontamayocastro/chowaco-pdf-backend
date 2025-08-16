// src/utils/quantity.js
// Parse common numeric + unit strings found in watershed plans (%, mg/L, ppm, cfs, etc.)
const Q = {
  PERCENT: /(-?\d+(?:\.\d+)?)\s*%/i,
  VALUE_UNIT: /(-?\d+(?:\.\d+)?)\s*(mg\/L|ppm|ppb|µg\/L|ug\/L|cfs|gpm|ac-ft|tons?|kg|lb|miles?|km|ha|acres?)/i,
};

function parseQuantity(input) {
  if (!input || typeof input !== 'string') return null;
  const m1 = input.match(Q.PERCENT);
  if (m1) return { value: Number(m1[1]), unit: '%' };
  const m2 = input.match(Q.VALUE_UNIT);
  if (m2) return { value: Number(m2[1]), unit: m2[2].toLowerCase() };
  const num = Number(String(input).replace(/[, ]/g, ''));
  if (Number.isFinite(num)) return { value: num };
  return null;
}

function normalizePercent(v) {
  if (v == null) return null;
  if (typeof v === 'number') return { value: v, unit: '%' };
  if (typeof v === 'string') {
    const q = parseQuantity(v);
    if (q && (q.unit === '%' || q.unit === undefined)) return { value: q.value, unit: q.unit || '%' };
  }
  return null;
}

module.exports = { parseQuantity, normalizePercent };
