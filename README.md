# 🎓 ScholarSync — AI-Powered Study Assistant

Upload your PDFs. Ask questions across all your documents. Get cited answers with page numbers in seconds.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express + TypeScript
- **AI/LLM:** Groq API (LLaMA 3.3 70B)
- **Embeddings:** HuggingFace Inference API (all-MiniLM-L6-v2, 384-dim)
- **Vector DB:** Supabase pgvector
- **PDF Parsing:** pdf-parse + LangChain RecursiveCharacterTextSplitter

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/lekhanpro/scholarsync.git
cd scholarsync
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `GROQ_API_KEY` | https://console.groq.com/keys |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `HF_API_KEY` | https://huggingface.co/settings/tokens |

### 3. Supabase Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pgvector
create extension if not exists vector;

-- Documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  original_name text not null,
  total_pages integer default 0,
  total_chunks integer default 0,
  status text default 'processing' check (status in ('processing', 'ready', 'error')),
  error_message text,
  created_at timestamptz default now()
);

-- Document chunks with vector embeddings
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  page_number integer not null,
  chunk_index integer not null,
  metadata jsonb default '{}',
  embedding vector(384),
  created_at timestamptz default now()
);

-- IVFFlat index for fast similarity search
create index if not exists document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RPC function for similarity search
create or replace function match_documents(
  query_embedding text,
  match_threshold float default 0.3,
  match_count int default 8,
  filter_document_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  page_number integer,
  chunk_index integer,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.page_number,
    dc.chunk_index,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding::vector) as similarity
  from document_chunks dc
  where
    (filter_document_ids is null or dc.document_id = any(filter_document_ids))
    and 1 - (dc.embedding <=> query_embedding::vector) > match_threshold
  order by dc.embedding <=> query_embedding::vector
  limit match_count;
end;
$$;
```

### 4. Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## License

MIT