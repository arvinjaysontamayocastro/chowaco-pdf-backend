const { corsHeaders } = require('../shared/cors');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({ message: 'API online' })
  };
};
