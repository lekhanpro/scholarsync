import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: "../.env" });
}

const HF_API_KEY = process.env.HF_API_KEY;
const HF_TIMEOUT_MS = parseInt(process.env.HF_TIMEOUT_MS || "20000", 10);
const HF_MAX_RETRIES = parseInt(process.env.HF_MAX_RETRIES || "3", 10);
const MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2";
const API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${MODEL_ID}`;

if (!HF_API_KEY) {
  throw new Error("Missing HF_API_KEY in environment variables");
}

async function fetchWithRetry(body: object): Promise<any> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= HF_MAX_RETRIES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HF_TIMEOUT_MS);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HuggingFace API error (${response.status}): ${errorText}`
        );
      }

      return response.json();
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      const backoff = Math.min(2000 * Math.pow(2, attempt), 10000);
      if (attempt < HF_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
      attempt += 1;
    }
  }

  throw lastError || new Error("HuggingFace API request failed");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.replace(/\n+/g, " ").trim().slice(0, 8000);

  const embedding = await fetchWithRetry({
    inputs: cleanText,
    options: { wait_for_model: true },
  });

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
