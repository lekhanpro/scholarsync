import { Request, Response } from 'express';
import OpenAI from 'openai';
import { searchDocuments, getDocumentContext } from '../services/ragService.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Citation {
  fileName: string;
  pageNumber: number;
  excerpt: string;
}

interface ChatResponse {
  answer: string;
  citations: Citation[];
  confidence: number;
}

function buildSystemPrompt(): string {
  return `You are ScholarSync, an intelligent academic assistant designed to help students understand and synthesize information from their study materials.

Your capabilities:
- Analyze and cross-reference multiple PDF documents
- Provide accurate, well-cited answers based on the uploaded materials
- Compare concepts across different sources (e.g., textbooks, lecture notes)
- Highlight differences and similarities between documents

Guidelines for responses:
1. ALWAYS base your answers on the provided context from the documents
2. When referencing information, cite the specific document and page number
3. If comparing documents, clearly indicate which document says what
4. If the context doesn't contain enough information, clearly state that
5. Be concise but thorough - aim for academic-quality explanations
6. Use markdown formatting for better readability

Citation format: [Document Name, Page X]

When asked to compare documents, structure your response as:
**Document A says:** [information] [citation]
**Document B says:** [information] [citation]
**Comparison:** [analysis of similarities/differences]`;
}

function extractCitations(searchResults: any[]): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];

  for (const result of searchResults) {
    const key = `${result.metadata.fileName}-${result.metadata.pageNumber}`;
    if (!seen.has(key)) {
      seen.add(key);
      citations.push({
        fileName: result.metadata.fileName,
        pageNumber: result.metadata.pageNumber,
        excerpt: result.content.substring(0, 150) + '...'
      });
    }
  }

  return citations.slice(0, 5);
}

export async function handleChat(req: Request, res: Response): Promise<void> {
  try {
    const { messages, documentIds, stream = false } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      res.status(400).json({ error: 'No user message found' });
      return;
    }

    const searchResults = await searchDocuments(lastUserMessage.content, {
      documentIds,
      topK: 10,
      threshold: 0.3
    });

    const context = await getDocumentContext(lastUserMessage.content, documentIds);

    const citations = extractCitations(searchResults);

    const systemPrompt = buildSystemPrompt();

    const enhancedMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `Here is the relevant context from the uploaded documents:\n\n${context}` },
      ...messages.map((m: ChatMessage) => ({
        role: m.role,
        content: m.content
      }))
    ];

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResponse = await openai.chat.completions.create({
        model: MODEL,
        messages: enhancedMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000
      });

      for await (const chunk of streamResponse) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ 
        done: true, 
        citations,
        confidence: searchResults.length > 0 ? 0.9 : 0.3 
      })}\n\n`);
      res.end();
    } else {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: enhancedMessages,
        temperature: 0.7,
        max_tokens: 2000
      });

      const response: ChatResponse = {
        answer: completion.choices[0]?.message?.content || 'No response generated',
        citations,
        confidence: searchResults.length > 0 ? 0.9 : 0.3
      };

      res.json(response);
    }

  } catch (error) {
    console.error('Chat error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        res.status(401).json({ error: 'Invalid API key configuration' });
        return;
      }
      if (error.message.includes('rate limit')) {
        res.status(429).json({ error: 'Rate limit exceeded, please try again' });
        return;
      }
    }

    res.status(500).json({ 
      error: 'Failed to process chat request',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

export async function handleCompare(req: Request, res: Response): Promise<void> {
  try {
    const { documents, query } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length < 2) {
      res.status(400).json({ error: 'At least two documents are required for comparison' });
      return;
    }

    if (!query) {
      res.status(400).json({ error: 'Query is required for comparison' });
      return;
    }

    const documentContexts = await Promise.all(
      documents.map(async (docId: string) => {
        const context = await getDocumentContext(query, [docId]);
        return { documentId: docId, context };
      })
    );

    const systemPrompt = `You are a comparative analysis expert. Your task is to compare how different documents address the same topic.

${documentContexts.map((dc, i) => `Document ${i + 1} (${dc.documentId}):\n${dc.context}`).join('\n\n---\n\n')}

Provide a structured comparison that:
1. Clearly states what each document says about the topic
2. Highlights similarities and differences
3. Provides a synthesized understanding`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Compare the documents on: ${query}` }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    res.json({
      comparison: completion.choices[0]?.message?.content,
      documents: documentContexts.map(dc => dc.documentId)
    });

  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ 
      error: 'Failed to compare documents',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}