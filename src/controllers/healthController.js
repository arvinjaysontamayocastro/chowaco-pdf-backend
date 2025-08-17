module.exports = async (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.ENVIRONMENT || 'unknown',
    timestamp: new Date().toISOString(),
  });
};
