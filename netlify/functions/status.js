// netlify/functions/status.js
// Purpose: fast status polling endpoint.

const { getJob } = require('../../lib/jobs');

exports.handler = async (event) => {
  try {
    const parts = (event.path || '').split('/');
    const guid = parts[parts.length - 1];
    if (!guid) return { statusCode: 400, body: 'Missing guid' };

    const job = await getJob(guid);
    if (!job)
      return { statusCode: 404, body: JSON.stringify({ status: 'missing' }) };

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: job.status,
        progress: job.progress,
        error: job.error || null,
      }),
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
};
