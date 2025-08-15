# Deployment (Netlify)

## Environment
- `OPENAI_API_KEY` (server-side only)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- Optional: `AI_MODEL`, `AI_MODEL_FALLBACK_EXPENSIVE`, `AI_TEMPERATURE`, `AI_MAX_TOKENS`

## Functions
- `upload` — multipart, creates job + saves file
- `status/:guid` — job progress polling
- `processPdf-background` — parses/embeds/stores (≤15 minutes)

## Notes
- Temp files stored in `os.tmpdir()` on Netlify.
- Increase file size limits cautiously.
