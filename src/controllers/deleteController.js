const documentService = require('../services/documentService');

module.exports = async (req, res) => {
  try {
    const guid = req.params.guid;
    if (!guid) return res.status(400).json({ error: 'GUID is required' });
    await documentService.deleteDocumentsByGuid(guid);
    return res.json({ message: `Document with GUID ${guid} deleted successfully` });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ error: err.message || 'Delete failed' });
  }
};
