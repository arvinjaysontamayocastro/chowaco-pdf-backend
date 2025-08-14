// backend/lib/jobs.js
// Lightweight job store for demo. Replace with Supabase/Postgres in production.

const fs = require('fs');
const path = require('path');
const os = require('os');

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

function writeDB(obj) {
  fs.writeFileSync(DB_PATH, JSON.stringify(obj));
}

async function insertJob(job) {
  const db = readDB();
  db[job.guid] = { ...job, updated_at: new Date().toISOString(), created_at: new Date().toISOString() };
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

// Writes the uploaded PDF to tmp and returns a file:// URL (stub)
async function writeFileTemp(guid, file) {
  const filename = `${guid}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  const p = path.join(FILES_DIR, filename);
  fs.writeFileSync(p, file.buffer);
  return `file://${p}`;
}

// Trigger a Netlify Background Function by calling its endpoint
async function triggerBackground(fnName, payload) {
  // In Netlify, you can call the function endpoint directly.
  // Here we just log; your live site will call: fetch(`/.netlify/functions/${fnName}`, { method:'POST', body: JSON.stringify(payload) })
  console.log(`Trigger background: ${fnName} with`, payload);
}

module.exports = {
  insertJob,
  updateJob,
  getJob,
  writeFileTemp,
  triggerBackground,
};
