import type { ChatResponse, Document } from "../types";

const API_BASE = "/api";

export async function uploadPDF(file: File): Promise<{ document: Document }> {
  const formData = new FormData();
  formData.append("pdf", file);
  const response = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  return response.json();
}

export async function getDocuments(): Promise<Document[]> {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) throw new Error("Failed to fetch documents");
  const data = await response.json();
  return data.documents;
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete document");
}

export async function sendChatMessage(
  query: string,
  documentIds?: string[],
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, documentIds, conversationHistory }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Chat failed" }));
    throw new Error(err.error || "Chat failed");
  }
  return response.json();
}