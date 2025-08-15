// backend/lib/jobs.js
// Lightweight job store for demo. Replace with Supabase/Postgres in production.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DB_PATH = path.join(os.tmpdir(), 'jobs.json');
const FILES_DIR = path.join(os.tmpdir(), 'pdf_uploads');

if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });

function readDB() {
  try {
    const txt = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(txt);
  } catch {
    return {};
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

async function insertJob(job) {
  const db = readDB();
  db[job.guid] = {
    ...job,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  writeDB(db);
}

async function updateJob(guid, patch) {
  const db = readDB();
  const cur = db[guid] || { guid };
  db[guid] = { ...cur, ...patch, updated_at: new Date().toISOString() };
  writeDB(db);
}

async function getJob(guid) {
  const db = readDB();
  return db[guid] || null;
}

/**
 * Persist an uploaded PDF buffer to temp storage and return its path.
 * Returned value: { filePath, filename }
 */
async function writeFileTemp({ buffer, filename }) {
  if (!buffer || !Buffer.isBuffer(buffer))
    throw new Error('writeFileTemp: buffer must be a Buffer');
  const safeName = filename
    ? filename.replace(/[^\w.\-]+/g, '_')
    : `upload_${Date.now()}.pdf`;
  const filePath = path.join(FILES_DIR, `${Date.now()}_${safeName}`);
  fs.writeFileSync(filePath, buffer);
  return { filePath, filename: safeName };
}

// lib/jobs.js
async function triggerBackground(fnName, payload) {
  // Production-safe: call Netlify background function endpoint
  const res = await fetch(`/.netlify/functions/${fnName}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      `triggerBackground failed: ${res.status} ${await res.text()}`
    );
  }
}

module.exports = {
  insertJob,
  updateJob,
  getJob,
  writeFileTemp,
  triggerBackground,
};
