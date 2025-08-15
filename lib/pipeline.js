// backend/lib/pipeline.js
// Real pipeline orchestrator: parse → chunk+embed → persist
// Moves heavy work off the request thread into a background function.

const fs = require('fs');
const path = require('path');

// Use your existing services
const documentService = require('../src/services/documentService');

/**
 * Run the end-to-end processing pipeline for a GUID + PDF file buffer.
 * Progress callbacks should be idempotent and quick.
 *
 * onProgress(percentage: number, note?: string)
 */
async function runPipeline({ guid, pdfBuffer, onProgress }) {
  if (!guid) throw new Error('runPipeline: missing guid');
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    throw new Error('runPipeline: pdfBuffer must be a Buffer');
  }

  // 1) Start
  await onProgress?.(5, 'queued');

  // 2) Parse + preprocess
  await onProgress?.(15, 'parsing');
  // documentService handles parse + chunk + embed + persist
  await documentService.processPDFAndStore(guid, pdfBuffer);

  // 3) Embed + store done inside processPDFAndStore
  await onProgress?.(65, 'embeddings_saved');

  // 4) Done
  await onProgress?.(95, 'finalizing');
  await onProgress?.(100, 'done');
}

module.exports = { runPipeline };
