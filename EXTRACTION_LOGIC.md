# Extraction Logic

**Goal:** Robust, precise extraction for unstructured watershed plans.

## Pipeline
1. **Parse** PDF (pdf-parse). Optional OCR step (Tesseract) can be added for scanned PDFs.
2. **Normalize** whitespace + paragraph boundaries.
3. **Chunk** with paragraph-aware overlap.
4. **Embed** chunks (OpenAI embeddings) and persist with GUID.
5. **Answer per section** on demand (frontend calls `/ask` per key) using field-anchored prompts and top-K retrieved chunks.
6. **Coerce JSON** to strict shapes (see `helpers/jsonCoerce.js`).

## Notes
- Question embeddings cached (`adapters/embeddingCache.js`).
- Retrieval is cosine similarity (can swap to MMR/rerank later).
- Background worker runs parsing/embedding/storage to keep uploads fast.
