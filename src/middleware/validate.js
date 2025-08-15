// Simple JSON body validation helper
module.exports = function validate(requiredFields) {
  return (req, res, next) => {
    for (const field of requiredFields) {
      if (!(field in req.body)) {
        return res.status(400).json({
          error: `Missing required field: ${field}`,
        });
      }
    }
    next();
  };
};
