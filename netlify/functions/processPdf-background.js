// netlify/functions/processPdf-background.js
// Purpose: long-running worker (≤ 15 min). Update job progress as you go.

const { getJob, updateJob } = require('../lib/jobs');
const { simulatePipeline } = require('../lib/pipeline');

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || '{}');
    const guid = payload.guid;
    if (!guid) return { statusCode: 400, body: 'Missing guid' };

    await updateJob(guid, { status: 'processing', progress: 5 });

    // Replace simulatePipeline with your real pipeline (parse/OCR/chunk/embed/extract/persist)
    await simulatePipeline(async (p) => {
      await updateJob(guid, { progress: p });
    });

    await updateJob(guid, { status: 'ready', progress: 100 });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    // best-effort guid recovery
    let guid = null;
    try { guid = JSON.parse(event.body || '{}').guid; } catch {}
    if (guid) await updateJob(guid, { status: 'error', error: String(e) });
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
};
