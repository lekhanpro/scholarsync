import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { supabase } from "../config/supabase.js";
import { groq, GROQ_MODEL, GROQ_TEMPERATURE, GROQ_MAX_TOKENS } from "../config/groq.js";
import { parsePDF, type PageContent } from "./pdfService.js";
import { generateEmbedding, generateEmbeddings } from "./embeddingService.js";
import { v4 as uuidv4 } from "uuid";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""],
});

export interface DocumentRecord {
  id: string;
  filename: string;
  original_name: string;
  total_pages: number;
  total_chunks: number;
  status: "processing" | "ready" | "error";
  error_message?: string;
  created_at: string;
}

export interface ChunkWithSource {
  content: string;
  page_number: number;
  chunk_index: number;
  document_id: string;
  filename: string;
  similarity: number;
}

export interface ChatResponse {
  answer: string;
  sources: Array<{
    filename: string;
    page_number: number;
    excerpt: string;
    similarity: number;
  }>;
  model: string;
}

export async function ingestPDF(
  filePath: string,
  originalName: string
): Promise<DocumentRecord> {
  const docId = uuidv4();

  const { error: insertError } = await supabase.from("documents").insert({
    id: docId,
    filename: filePath.split("/").pop() || originalName,
    original_name: originalName,
    status: "processing",
  });

  if (insertError) {
    throw new Error(`Failed to create document record: ${insertError.message}`);
  }

  try {
    console.log(`[RAG] Parsing PDF: ${originalName}`);
    const parsed = await parsePDF(filePath);
    console.log(
      `[RAG] Extracted ${parsed.totalPages} pages, ${parsed.text.length} characters`
    );

    console.log(`[RAG] Chunking text...`);
    const allChunks: Array<{
      content: string;
      pageNumber: number;
      chunkIndex: number;
    }> = [];

    let globalChunkIndex = 0;

    for (const page of parsed.pages) {
      if (page.text.length < 30) continue;

      const chunks = await textSplitter.splitText(page.text);

      for (const chunk of chunks) {
        allChunks.push({
          content: chunk,
          pageNumber: page.pageNumber,
          chunkIndex: globalChunkIndex++,
        });
      }
    }

    if (allChunks.length === 0) {
      throw new Error("No meaningful text chunks extracted from PDF");
    }

    console.log(`[RAG] Created ${allChunks.length} chunks`);

    console.log(`[RAG] Generating embeddings...`);
    const chunkTexts = allChunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    console.log(`[RAG] Storing in vector database...`);
    const rows = allChunks.map((chunk, i) => ({
      id: uuidv4(),
      document_id: docId,
      content: chunk.content,
      page_number: chunk.pageNumber,
      chunk_index: chunk.chunkIndex,
      metadata: {
        original_name: originalName,
        page: chunk.pageNumber,
      },
      embedding: JSON.stringify(embeddings[i]),
    }));

    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error: chunkError } = await supabase
        .from("document_chunks")
        .insert(batch);

      if (chunkError) {
        throw new Error(
          `Failed to store chunks (batch ${i}): ${chunkError.message}`
        );
      }
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "ready",
        total_pages: parsed.totalPages,
        total_chunks: allChunks.length,
      })
      .eq("id", docId);

    if (updateError) {
      console.error(`[RAG] Warning: Failed to update status: ${updateError.message}`);
    }

    console.log(`[RAG] Successfully ingested: ${originalName}`);

    return {
      id: docId,
      filename: filePath.split("/").pop() || originalName,
      original_name: originalName,
      total_pages: parsed.totalPages,
      total_chunks: allChunks.length,
      status: "ready",
      created_at: new Date().toISOString(),
    };
  } catch (error: any) {
    await supabase
      .from("documents")
      .update({
        status: "error",
        error_message: error.message,
      })
      .eq("id", docId);

    throw error;
  }
}

export async function searchDocuments(
  query: string,
  documentIds?: string[],
  topK: number = 8,
  threshold: number = 0.3
): Promise<ChunkWithSource[]> {
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: topK,
    filter_document_ids: documentIds || null,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const docIdSet = [...new Set(data.map((d: any) => d.document_id))];
  const { data: docs } = await supabase
    .from("documents")
    .select("id, original_name")
    .in("id", docIdSet);

  const docMap = new Map(docs?.map((d: any) => [d.id, d.original_name]) || []);

  return data.map((chunk: any) => ({
    content: chunk.content,
    page_number: chunk.page_number,
    chunk_index: chunk.chunk_index,
    document_id: chunk.document_id,
    filename: docMap.get(chunk.document_id) || "Unknown file",
    similarity: chunk.similarity,
  }));
}

export async function ragChat(
  query: string,
  documentIds?: string[],
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<ChatResponse> {
  const chunks = await searchDocuments(query, documentIds);

  if (chunks.length === 0) {
    return {
      answer:
        "I couldn't find any relevant information in your uploaded documents for this question. Please try rephrasing or make sure you've uploaded the relevant PDFs.",
      sources: [],
      model: GROQ_MODEL,
    };
  }

  const contextBlocks = chunks.map((chunk, i) => {
    return `[Source ${i + 1}: "${chunk.filename}", Page ${chunk.page_number}]\n${chunk.content}`;
  });

  const context = contextBlocks.join("\n\n---\n\n");

  const systemPrompt = `You are ScholarSync, an AI study assistant. Your job is to answer questions using ONLY the provided document excerpts. Follow these rules strictly:

1. Answer accurately using information from the provided sources below.
2. ALWAYS cite your sources using this format: **[Source: "filename.pdf", Page X]** after each claim.
3. When comparing across documents, clearly label which information comes from which file.
4. Use clear formatting: headers, bullet points, bold text for readability.
5. If the provided sources don't contain enough information, say so clearly.
6. Never make up information that isn't in the sources.

--- DOCUMENT EXCERPTS ---
${context}
-------------------------`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  if (conversationHistory && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-6);
    for (const msg of recent) {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  messages.push({ role: "user", content: query });

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: GROQ_TEMPERATURE,
    max_tokens: GROQ_MAX_TOKENS,
    top_p: 0.9,
  });

  const answer =
    completion.choices[0]?.message?.content ||
    "I was unable to generate a response. Please try again.";

  const uniqueSources = new Map<string, ChunkWithSource>();
  for (const chunk of chunks) {
    const key = `${chunk.filename}-p${chunk.page_number}`;
    if (
      !uniqueSources.has(key) ||
      chunk.similarity > (uniqueSources.get(key)?.similarity || 0)
    ) {
      uniqueSources.set(key, chunk);
    }
  }

  const sources = Array.from(uniqueSources.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6)
    .map((chunk) => ({
      filename: chunk.filename,
      page_number: chunk.page_number,
      excerpt: chunk.content.slice(0, 150) + "...",
      similarity: Math.round(chunk.similarity * 100) / 100,
    }));

  return { answer, sources, model: GROQ_MODEL };
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list documents: ${error.message}`);
  return data || [];
}

export async function deleteDocument(docId: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("id", docId);
  if (error) throw new Error(`Failed to delete document: ${error.message}`);
}