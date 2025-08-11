const documentService = require('../services/documentService');

module.exports = async (req, res) => {
  try {
    console.log(req);
    const guid = req.body.guid;
    if (!guid) return res.status(400).json({ error: 'GUID is required' });
    if (!req.file)
      return res.status(400).json({ error: 'PDF file is required' });

    const result = await documentService.processPDFAndStore(
      guid,
      req.file.buffer
    );
    return res.json({
      message: 'Document uploaded successfully',
      guid,
      chunks: result.chunksCount,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
};
