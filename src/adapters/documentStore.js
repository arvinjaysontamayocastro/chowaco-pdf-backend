const { supabase } = require('../config/supabaseClient');

async function saveDocument(guid, chunks, embeddings) {
  const { error } = await supabase
    .from('documents')
    .upsert([{ guid, chunks, embeddings }], { onConflict: ['guid'] });
  if (error) throw error;
}

async function getDocument(guid) {
  const { data, error } = await supabase
    .from('documents')
    .select('chunks, embeddings')
    .eq('guid', guid)
    .single();
  if (error) {
    if (error.code === 'PGRST116' || (error.message && error.message.includes('No rows')) ) return null;
    throw error;
  }
  return data;
}

async function deleteDocument(guid) {
  const { error } = await supabase.from('documents').delete().eq('guid', guid);
  if (error) throw error;
  return true;
}

module.exports = { saveDocument, getDocument, deleteDocument };
