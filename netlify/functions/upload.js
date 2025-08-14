// netlify/functions/upload.js
// Purpose: accept multipart upload FAST, create a job row, trigger background processing, return { guid } immediately.
// Notes: Replace storage stubs with S3/Supabase in production.

const busboy = require('busboy');
const { insertJob, triggerBackground, writeFileTemp } = require('../lib/jobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  if (!contentType.startsWith('multipart/form-data')) {
    return { statusCode: 400, body: 'Expected multipart/form-data' };
  }

  try {
    const bb = busboy({ headers: { 'content-type': contentType } });
    const fields = {};
    const files = [];

    await new Promise((resolve, reject) => {
      bb.on('field', (name, val) => { fields[name] = val; });
      bb.on('file', (name, file, info) => {
        const chunks = [];
        file.on('data', (d) => chunks.push(d));
        file.on('end', () => {
          files.push({ name: info.filename, mime: info.mimeType, buffer: Buffer.concat(chunks) });
        });
      });
      bb.on('close', resolve);
      bb.on('error', reject);
      bb.end(Buffer.from(event.body, 'base64'));
    });

    const guid = fields.guid;
    if (!guid) return { statusCode: 400, body: 'Missing guid' };
    const pdf = files.find(f => f.name && f.name.toLowerCase().endsWith('.pdf'));
    if (!pdf) return { statusCode: 400, body: 'Missing PDF file' };

    // Store file (stub -> writes to tmp path). Replace with S3/Supabase
    const fileUrl = await writeFileTemp(guid, pdf);

    await insertJob({
      guid,
      status: 'queued',
      progress: 0,
      file_url: fileUrl,
      error: null
    });

    // Fire & forget background job
    await triggerBackground('processPdf-background', { guid });

    return {
      statusCode: 200,
      body: JSON.stringify({ guid })
    };
  } catch (e) {
    return { statusCode: 500, body: `Upload error: ${e.message || e}` };
  }
};
