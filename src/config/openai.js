// src/config/openai.js
// /////////////////////////////
// Centralized OpenAI config (primary + fallback models)
// /////////////////////////////
require('dotenv').config();

module.exports = {
  primaryModel: process.env.AI_MODEL || 'gpt-5-mini',
  fallbackModel: process.env.AI_MODEL_FALLBACK_EXPENSIVE || 'gpt-5',
  temperature: Number(process.env.AI_TEMPERATURE ?? 0),
  maxTokens: Number(process.env.AI_MAX_TOKENS ?? 1200),
};
