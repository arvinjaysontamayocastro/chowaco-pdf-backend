const { supabase } = require('../config/supabaseClient');

async function createOpenLink({ guid, meta, payload }) {
  const insert = { guid, meta_json: meta, payload_json: payload };
  const { data, error } = await supabase
    .from('openlinks')
    .insert(insert)
    .select('public_id, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function getOpenLinkByPublicId(publicId) {
  const { data, error } = await supabase
    .from('openlinks')
    .select('guid, public_id, meta_json, payload_json, created_at')
    .eq('public_id', publicId)
    .single();
  if (error) throw error;
  return data;
}

async function listOpenLinks() {
  const { data, error } = await supabase
    .from('openlinks')
    .select('public_id, created_at, meta_json')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

module.exports = {
  createOpenLink,
  getOpenLinkByPublicId,
  listOpenLinks,
};
