const documentService = require('../services/documentService');
module.exports = async (req, res) => {
  try {
    const { guid, key } = req.body;
    if (!guid || !key)
      return res.status(400).json({ error: 'guid and key are required' });

    const answer = await documentService.getAnswerForGuid(guid, key);
    console.log(
      '*********************************************************************************************',
      key
    );
    console.log('key', key);
    console.log('Answer:', answer);
    return res.json({ answer });
  } catch (err) {
    console.error('Ask error:', err);
    return res
      .status(500)
      .json({ error: err.message || 'Question answering failed' });
  }
};
