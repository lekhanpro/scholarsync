import { useState, useCallback } from "react";
import { sendChatMessage } from "../services/api";
import type { ChatMessage } from "../types";

let messageCounter = 0;

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const send = useCallback(async (query: string, documentIds?: string[]) => {
    if (!query.trim() || isLoading) return;
    const userMessage: ChatMessage = {
      id: `msg-${++messageCounter}`, role: "user", content: query, timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const response = await sendChatMessage(query, documentIds, history);
      const assistantMessage: ChatMessage = {
        id: `msg-${++messageCounter}`, role: "assistant", content: response.answer,
        sources: response.sources, model: response.model, timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg-${++messageCounter}`, role: "assistant",
        content: `Error: ${err.message}. Please try again.`, timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearChat = useCallback(() => { setMessages([]); }, []);

  return { messages, isLoading, send, clearChat };
}