// netlify/functions/processPdf-background.js
// Purpose: long-running worker (≤ 15 min). Update job progress as you go.

const fs = require('fs');
const path = require('path');

const { runPipeline } = require('../../lib/pipeline');
const { getJob, updateJob } = require('../../lib/jobs');

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || '{}');
    const guid = payload.guid;
    if (!guid) return { statusCode: 400, body: 'Missing guid' };

    // get job (should include filePath)
    const job = await getJob(guid);
    if (!job || !job.filePath) {
      return { statusCode: 400, body: 'Missing job or filePath' };
    }

    await updateJob(guid, { status: 'processing', progress: 5 });

    const pdfBuffer = fs.readFileSync(job.filePath);

    await runPipeline({
      guid,
      pdfBuffer,
      onProgress: async (p, note) => {
        await updateJob(guid, { progress: p, status: note || 'processing' });
      },
    });

    await updateJob(guid, { status: 'done', progress: 100 });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    // best-effort guid recovery
    let guid = null;
    try {
      guid = JSON.parse(event.body || '{}').guid;
    } catch {}
    if (guid) await updateJob(guid, { status: 'error', error: String(e) });
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: false, error: String(e) }),
    };
  }
};
