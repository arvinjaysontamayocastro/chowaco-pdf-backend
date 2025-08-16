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


## Worked Example (one page → chunks → topK → JSON)
1. **Input**: Bell Creek/Muddy Creek (2012) PDF page with pollutant targets.
2. **Chunking**: Overlap = 200, Size = 800 → preserves sentence context.
3. **Retrieval**: For `pollutants`, we build a field-anchored query by appending a HINT about units/targets; run cosine → MMR.
4. **Sources**: Keep top 8 with page/idx; drop TOC/appendix via heuristic.
5. **LLM**: Ask with strict JSON; coerce via zod schema.
6. **Output**: Array of `{ type, unit, baseline, target }` plus `confidence` from retrieval scores.
