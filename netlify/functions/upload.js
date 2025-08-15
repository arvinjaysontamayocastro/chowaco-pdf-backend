// netlify/functions/upload.js
// Purpose: accept multipart upload FAST, create a job row, trigger background processing, return { guid } immediately.
// Notes: Replace storage stubs with S3/Supabase in production.

const Busboy = require('busboy');
const { insertJob, triggerBackground, writeFileTemp } = require('../../lib/jobs');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return { statusCode: 400, body: 'Expected multipart/form-data' };
    }

    const bb = Busboy({ headers: { 'content-type': contentType } });

    let guid = null;
    let fileBuffer = Buffer.alloc(0);
    let filename = null;

    await new Promise((resolve, reject) => {
      bb.on('field', (name, val) => {
        if (name === 'guid') guid = val;
      });
      bb.on('file', (name, stream, info) => {
        filename = info && info.filename ? info.filename : 'upload.pdf';
        stream.on('data', (d) => (fileBuffer = Buffer.concat([fileBuffer, d])));
        stream.on('limit', () => reject(new Error('File too large')));
        stream.on('end', () => {});
      });
      bb.on('error', reject);
      bb.on('finish', resolve);
      bb.end(Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8'));
    });

    if (!guid) return { statusCode: 400, body: 'Missing guid' };
    if (!fileBuffer.length) return { statusCode: 400, body: 'Missing file' };

    const { filePath } = await writeFileTemp({ buffer: fileBuffer, filename });

    await insertJob({
      guid,
      status: 'queued',
      progress: 0,
      filePath,
      error: null,
    });

    // Fire & forget: your frontend should POST to the background endpoint
    // Here we log for local dev; in production, you can immediately call it.
    await triggerBackground('processPdf-background', { guid });

    return { statusCode: 200, body: JSON.stringify({ guid }) };
  } catch (e) {
    return { statusCode: 500, body: `Upload error: ${e.message || e}` };
  }
};
