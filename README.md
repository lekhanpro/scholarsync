# ScholarSync

An AI-powered study assistant that allows students to upload multiple PDF notes, index them using vector embeddings, and perform cross-document queries.

## Features

- **PDF Upload & Processing**: Upload multiple PDF documents with drag-and-drop support
- **Vector Search**: Semantic search across all uploaded documents using OpenAI embeddings
- **RAG Pipeline**: Retrieval-Augmented Generation for accurate, cited answers
- **Cross-Document Queries**: Compare concepts across multiple documents
- **Streaming Responses**: Real-time AI response streaming
- **Premium Glassmorphism UI**: Dark mode with backdrop blur effects and animations

## Tech Stack

- **Frontend**: React (Vite) + TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js + Express, TypeScript
- **AI/ML**: LangChain.js, OpenAI API (GPT-4, text-embedding-3-small)
- **Vector Database**: Supabase (pgvector)

## Project Structure

```
ScholarSync/
├── package.json              # Root workspace config
├── client/                   # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── GlassLayout.tsx
│   │   │   └── FileUpload.tsx
│   │   ├── pages/
│   │   │   └── Dashboard.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── server/                   # Backend Express application
    ├── src/
    │   ├── controllers/
    │   │   ├── chatController.ts
    │   │   └── uploadController.ts
    │   ├── services/
    │   │   └── ragService.ts
    │   ├── middleware/
    │   │   └── uploadMiddleware.ts
    │   ├── routes/
    │   │   ├── upload.ts
    │   │   ├── chat.ts
    │   │   └── documents.ts
    │   └── index.ts
    ├── package.json
    └── tsconfig.json
```

## Prerequisites

- Node.js 18+ installed
- OpenAI API key
- Supabase account with a project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to the project
cd ScholarSync

# Install all dependencies (root, client, server)
npm install
```

### 2. Set Up Supabase Database

Run this SQL in your Supabase SQL Editor to create the required tables and functions:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  file_name TEXT NOT NULL,
  total_chunks INTEGER DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document embeddings table with vector column
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL,
  embedding VECTOR(1536)
);

-- Create index for vector similarity search
CREATE INDEX ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 5,
  filter_document_ids TEXT[] DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.content,
    de.metadata,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM document_embeddings de
  WHERE 
    (filter_document_ids IS NULL OR 
     de.metadata->>'documentId' = ANY(filter_document_ids))
    AND (1 - (de.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3. Configure Environment Variables

Create `server/.env` based on the example:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your credentials:

```env
PORT=5000
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173
```

### 4. Run the Application

```bash
# Run both frontend and backend in development mode
npm run dev

# Or run separately:
npm run dev:server  # Backend on port 5000
npm run dev:client  # Frontend on port 5173
```

### 5. Open in Browser

Navigate to `http://localhost:5173`

## API Endpoints

### Upload
- `POST /api/upload/single` - Upload a single PDF
- `POST /api/upload/multiple` - Upload multiple PDFs

### Chat
- `POST /api/chat` - Send a chat message (supports streaming)
- `POST /api/chat/compare` - Compare documents on a topic

### Documents
- `GET /api/documents` - List all uploaded documents
- `DELETE /api/documents/:id` - Delete a document

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for embeddings and chat | Yes |
| `OPENAI_MODEL` | Model for chat completions (default: gpt-4-turbo-preview) | No |
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `PORT` | Server port (default: 5000) | No |
| `CLIENT_URL` | Frontend URL for CORS (default: http://localhost:5173) | No |

## Building for Production

```bash
# Build both client and server
npm run build

# Start production server
npm start
```

## GitHub Setup & Deployment

### Initialize Git Repository

```bash
# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: ScholarSync AI study assistant"

# Add your GitHub remote
git remote add origin https://github.com/yourusername/scholarsync.git

# Push to GitHub
git push -u origin main
```

### Deploy to Vercel/Render

1. Connect your GitHub repository to Vercel or Render
2. Set environment variables in the deployment dashboard
3. Deploy!

## License

MIT