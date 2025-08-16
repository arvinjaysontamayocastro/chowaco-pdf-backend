const openService = require('../services/openLinkService');

function isRecord(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

module.exports.create = async (req, res) => {
  try {
    const { guid, meta, data } = req.body || {};
    if (!guid || typeof guid !== 'string') {
      return res.status(400).json({ error: 'guid is required' });
    }
    if (!isRecord(meta)) {
      return res.status(400).json({ error: 'meta (object) is required' });
    }
    if (!isRecord(data)) {
      return res.status(400).json({ error: 'data (object) is required' });
    }
    const result = await openService.createOpenLink({
      guid,
      meta,
      payload: data,
    });
    return res.json(result);
  } catch (err) {
    console.error('[openlinks:create] error', err);
    return res
      .status(500)
      .json({ error: err.message || 'Create open link failed' });
  }
};

module.exports.getByPublicId = async (req, res) => {
  try {
    const { publicId } = req.params;
    if (!publicId)
      return res.status(400).json({ error: 'publicId is required' });
    const row = await openService.getOpenLinkByPublicId(publicId);
    return res.json({
      guid: row.guid,
      publicId: row.public_id,
      meta: row.meta_json,
      data: row.payload_json,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('[openlinks:get] error', err);
    return res
      .status(500)
      .json({ error: err.message || 'Get open link failed' });
  }
};

module.exports.listByGuid = async (req, res) => {
  try {
    const { guid } = req.query;
    if (!guid) return res.status(400).json({ error: 'guid query is required' });
    const arr = await openService.listOpenLinksByGuid(guid);
    return res.json(
      arr.map((row) => ({
        publicId: row.public_id,
        createdAt: row.created_at,
        meta: row.meta_json,
      }))
    );
  } catch (err) {
    console.error('[openlinks:list] error', err);
    return res
      .status(500)
      .json({ error: err.message || 'List open links failed' });
  }
};
