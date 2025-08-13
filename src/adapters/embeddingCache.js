// Production-safe
const { supabase } = require('../config/supabaseClient');

const TABLE = 'question_embeddings';

async function getCachedEmbedding(key, model) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('embedding')
    .eq('key', key)
    .eq('model', model)
    .single();

  if (error && error.code !== 'PGRST116') {
    // not "No rows found"
    throw error;
  }
  return data ? data.embedding : null; // returns JSON array of numbers or null
}

async function setCachedEmbedding(key, model, embedding) {
  const payload = {
    key,
    model,
    embedding, // e.g., [0.01, -0.02, ...]
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'key,model' });

  if (error) throw error;
  return true;
}

module.exports = { getCachedEmbedding, setCachedEmbedding };
