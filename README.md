# Chowaco PDF Backend (Netlify + Supabase Ready)

PDF → embeddings → GPT backend, prepared to run locally or as Netlify Functions with Supabase persistence.

## Features

- Upload PDF (multipart/form-data) with `guid` and process into chunks + embeddings
- Store chunks & embeddings in Supabase (table: `documents`)
- Ask questions by `guid` to run RAG using stored embeddings
- Delete documents by `guid`
- Multer `memoryStorage()` with 100MB upload limit

## Setup

1. Install dependencies

```bash
npm install
```

2. Create a Supabase project and run this SQL in the SQL editor:

```sql
create table documents (
  guid text primary key,
  chunks jsonb,
  embeddings jsonb
);
create table if not exists question_embeddings (
  key text not null,
  model text not null,
  embedding jsonb not null,   -- store as JSON array of numbers; no pgvector requirement
  updated_at timestamptz not null default now(),
  primary key (key, model)
);
-- Enable once
create extension if not exists "pgcrypto";

-- Create table if you haven't yet
create table if not exists public.openlinks (
  guid         text        not null,
  public_id    uuid        primary key default gen_random_uuid(),
  meta_json    jsonb       not null,
  payload_json jsonb       not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_openlinks_guid on public.openlinks (guid);
```

3. Add environment variables (local `.env` or Netlify environment variables):

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4.1...
```

4. Run locally (Express)

```bash
npm start
# or for serverless emulation with Netlify CLI
netlify dev
```

## Endpoints (local)

- `POST /upload` — multipart/form-data with fields: `guid`, `pdf` (file)
- `POST /ask` — JSON `{ "guid": "...", "key": "question_key" }`
- `DELETE /documents/:guid` — deletes the document data

## Notes

- The `src/utils/rag.js` and `src/utils/extractText.js` are included if available from your original repo; otherwise placeholders are provided. Replace them with your actual implementations for embeddings and GPT calls.
- Netlify Functions use `netlify/functions/api.js` which wraps the Express app using `serverless-http`.
- For production, use Supabase Service Role Key securely (Netlify environment variables).
