import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import { readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    fileName: string;
    chunkIndex: number;
    pageNumber: number;
    totalChunks: number;
    createdAt: string;
  };
  embedding: number[];
}

interface ProcessedDocument {
  documentId: string;
  fileName: string;
  totalChunks: number;
  totalPages: number;
  status: 'success' | 'error';
  error?: string;
}

interface SearchResult {
  content: string;
  metadata: {
    documentId: string;
    fileName: string;
    chunkIndex: number;
    pageNumber: number;
  };
  similarity: number;
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small',
  dimensions: 1536
});

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', ' ', '']
});

const UPLOADS_DIR = join(process.cwd(), 'uploads');

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function processPDF(
  filePath: string, 
  originalFileName: string
): Promise<ProcessedDocument> {
  const documentId = uuidv4();
  
  try {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const dataBuffer = readFileSync(filePath);
    
    let pdfData;
    try {
      pdfData = await pdf(dataBuffer);
    } catch (pdfError) {
      throw new Error(`Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
    }

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error('PDF contains no extractable text');
    }

    const text = pdfData.text;
    const totalPages = pdfData.numpages || 1;

    const chunks = await textSplitter.splitText(text);

    if (chunks.length === 0) {
      throw new Error('No chunks generated from PDF text');
    }

    const chunksPerPage = Math.ceil(chunks.length / totalPages);

    const documentChunks: DocumentChunk[] = await Promise.all(
      chunks.map(async (chunk, index) => {
        const embedding = await embeddings.embedDocuments([chunk]);
        const estimatedPage = Math.min(Math.floor(index / chunksPerPage) + 1, totalPages);
        
        return {
          id: uuidv4(),
          content: chunk,
          metadata: {
            documentId,
            fileName: originalFileName,
            chunkIndex: index,
            pageNumber: estimatedPage,
            totalChunks: chunks.length,
            createdAt: new Date().toISOString()
          },
          embedding: embedding[0]
        };
      })
    );

    const { error: insertError } = await supabase
      .from('document_embeddings')
      .insert(documentChunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        metadata: chunk.metadata,
        embedding: chunk.embedding
      })));

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw new Error(`Failed to store embeddings: ${insertError.message}`);
    }

    const { error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        file_name: originalFileName,
        total_chunks: chunks.length,
        total_pages: totalPages,
        status: 'processed',
        created_at: new Date().toISOString()
      });

    if (docError) {
      console.error('Document metadata insert error:', docError);
    }

    try {
      unlinkSync(filePath);
    } catch (unlinkError) {
      console.warn('Failed to delete temporary file:', unlinkError);
    }

    return {
      documentId,
      fileName: originalFileName,
      totalChunks: chunks.length,
      totalPages,
      status: 'success'
    };

  } catch (error) {
    console.error('PDF processing error:', error);
    
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (e) {
        console.warn('Cleanup failed:', e);
      }
    }

    return {
      documentId,
      fileName: originalFileName,
      totalChunks: 0,
      totalPages: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function searchDocuments(
  query: string,
  options: {
    documentIds?: string[];
    topK?: number;
    threshold?: number;
  } = {}
): Promise<SearchResult[]> {
  const { documentIds, topK = 5, threshold = 0.5 } = options;

  try {
    const queryEmbedding = await embeddings.embedDocuments([query]);

    let rpcCall = supabase.rpc('match_documents', {
      query_embedding: queryEmbedding[0],
      match_count: topK,
      filter_document_ids: documentIds || null,
      similarity_threshold: threshold
    });

    const { data, error } = await rpcCall;

    if (error) {
      console.error('Vector search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((result: any) => ({
      content: result.content,
      metadata: result.metadata,
      similarity: result.similarity
    }));

  } catch (error) {
    console.error('Document search error:', error);
    throw error;
  }
}

export async function getDocumentContext(
  query: string,
  documentIds?: string[]
): Promise<string> {
  const results = await searchDocuments(query, { documentIds, topK: 10 });

  if (results.length === 0) {
    return 'No relevant information found in uploaded documents.';
  }

  const contextParts = results.map((result, index) => {
    const { fileName, pageNumber, chunkIndex } = result.metadata;
    return `[Document: ${fileName}, Page: ${pageNumber}]\n${result.content}`;
  });

  return contextParts.join('\n\n---\n\n');
}

export async function listDocuments(): Promise<any[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('List documents error:', error);
    return [];
  }

  return data || [];
}

export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    const { error: chunksError } = await supabase
      .from('document_embeddings')
      .delete()
      .eq('metadata->>documentId', documentId);

    if (chunksError) {
      console.error('Delete chunks error:', chunksError);
      return false;
    }

    const { error: docError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (docError) {
      console.error('Delete document error:', docError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete document error:', error);
    return false;
  }
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}