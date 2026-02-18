import { Request, Response } from "express";
import { ragChat } from "../services/ragService.js";

export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { query, documentIds, conversationHistory } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      res.status(400).json({ error: "Query is required" });
      return;
    }

    if (query.length > 5000) {
      res.status(400).json({ error: "Query must be under 5000 characters" });
      return;
    }

    console.log(`[Chat] Query: "${query.slice(0, 100)}..."`);

    const response = await ragChat(
      query.trim(),
      documentIds,
      conversationHistory
    );

    res.json(response);
  } catch (error: any) {
    console.error(`[Chat] Error: ${error.message}`);
    res.status(500).json({
      error: "Failed to generate response",
      details: error.message,
    });
  }
}