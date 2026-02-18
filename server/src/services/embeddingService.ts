import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2";
const API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${MODEL_ID}`;

if (!HF_API_KEY) {
  throw new Error("Missing HF_API_KEY in environment variables");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.replace(/\n+/g, " ").trim().slice(0, 8000);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: cleanText,
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HuggingFace API error (${response.status}): ${errorText}`
    );
  }

  const embedding = await response.json();

  if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
    return embedding[0];
  }
  if (Array.isArray(embedding) && typeof embedding[0] === "number") {
    return embedding;
  }

  throw new Error("Unexpected embedding format from HuggingFace API");
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += 5) {
    const batch = texts.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );
    embeddings.push(...batchResults);

    if (i + 5 < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return embeddings;
}