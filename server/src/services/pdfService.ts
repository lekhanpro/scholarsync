import fs from "fs/promises";
import path from "path";

async function getPdfParse() {
  const module = await import("pdf-parse");
  return module.default || module;
}

export interface ParsedPDF {
  text: string;
  pages: PageContent[];
  totalPages: number;
  metadata: {
    title?: string;
    author?: string;
  };
}

export interface PageContent {
  pageNumber: number;
  text: string;
}

export async function parsePDF(filePath: string): Promise<ParsedPDF> {
  const absolutePath = path.resolve(filePath);

  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`PDF file not found: ${absolutePath}`);
  }

  const fileBuffer = await fs.readFile(absolutePath);

  if (fileBuffer.length === 0) {
    throw new Error("PDF file is empty");
  }

  const pdfParse = await getPdfParse();

  try {
    const data = await pdfParse(fileBuffer, { max: 500 });

    if (!data.text || data.text.trim().length === 0) {
      throw new Error(
        "PDF appears to be scanned/image-based - no extractable text found"
      );
    }

    const rawPages = data.text.split(/\f/);
    const pages: PageContent[] = rawPages
      .map((pageText: string, index: number) => ({
        pageNumber: index + 1,
        text: pageText.trim(),
      }))
      .filter((page: PageContent) => page.text.length > 20);

    if (pages.length === 0) {
      pages.push({ pageNumber: 1, text: data.text.trim() });
    }

    return {
      text: data.text,
      pages,
      totalPages: data.numpages || pages.length,
      metadata: {
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
      },
    };
  } catch (error: any) {
    if (error.message.includes("no extractable text")) {
      throw error;
    }
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}