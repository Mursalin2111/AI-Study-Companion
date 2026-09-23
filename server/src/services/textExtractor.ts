import fs from 'node:fs';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { config } from '../config.js';

export interface ExtractedDocument {
  text: string;
  pages: Array<{ pageNumber: number; text: string }>;
}

export async function extractTextFromFile(filePath: string, originalName: string): Promise<ExtractedDocument> {
  const ext = path.extname(originalName).toLowerCase();

  if (!fs.existsSync(filePath)) {
    throw new Error('Target file does not exist on disk.');
  }

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const pages: Array<{ pageNumber: number; text: string }> = [];

    // Custom pager callback to capture page texts
    const renderPage = (pageData: any) => {
      return pageData.getTextContent().then((textContent: any) => {
        let lastY = -1;
        let text = '';
        for (const item of textContent.items) {
          if (lastY === -1 || Math.abs(item.transform[5] - lastY) < 5) {
            text += item.str + ' ';
          } else {
            text += '\n' + item.str + ' ';
          }
          lastY = item.transform[5];
        }
        return text;
      });
    };

    const pdfResult = await pdfParse(dataBuffer, { pagerender: renderPage });
    const fullText = cleanText(pdfResult.text);

    // If pdf-parse didn't give multi-page split via text, synthesize pages
    const numPages = pdfResult.numpages || 1;
    if (pages.length === 0) {
      const charsPerPage = Math.max(500, Math.floor(fullText.length / numPages));
      for (let i = 0; i < numPages; i++) {
        const pageText = fullText.substring(i * charsPerPage, (i + 1) * charsPerPage);
        pages.push({ pageNumber: i + 1, text: pageText.trim() });
      }
    }

    return {
      text: fullText,
      pages,
    };
  }

  if (ext === '.docx' || ext === '.doc') {
    const docResult = await mammoth.extractRawText({ path: filePath });
    const text = cleanText(docResult.value);
    return {
      text,
      pages: [{ pageNumber: 1, text }],
    };
  }

  if (ext === '.pptx' || ext === '.ppt') {
    // For PPTX, parse text lines
    const content = fs.readFileSync(filePath, 'utf-8');
    // Extract textual XML content or fallback to raw strings
    const cleanPpt = cleanText(content.replace(/<[^>]+>/g, ' '));
    const finalPpt = cleanPpt.length > 50 ? cleanPpt : 'Presentation slides content: ' + path.basename(originalName);
    return {
      text: finalPpt,
      pages: [{ pageNumber: 1, text: finalPpt }],
    };
  }

  // Multimodal image lecture notes (PNG, JPG, JPEG, WEBP)
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    let extractedText = '';

    if (config.geminiApiKey && config.geminiApiKey.trim().length > 10) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
        const imageBuffer = fs.readFileSync(filePath);
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

        const imagePart = {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType,
          },
        };

        const response: any = await (ai as any).models.generateContent({
          model: config.geminiModel || 'gemini-3.8-flash',
          contents: [
            imagePart,
            `You are an expert academic lecture notes transcriber and OCR system.
Transcribe and structure all handwritten notes, blackboard equations, diagrams, and section headings from this image into structured, high-yield academic Markdown.
- Format all formulas in standard LaTeX notation ($...$ for inline or $$...$$ for block).
- Preserve table structures, lists, and definitions.
- If diagrams or graphs are present, describe their components and takeaways clearly.`,
          ],
        });

        extractedText = response?.text || (response?.candidates?.[0]?.content?.parts?.[0]?.text) || '';
      } catch (err) {
        console.warn('[textExtractor] Gemini Vision OCR failed, using fallback placeholder:', err);
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      const baseName = path.basename(originalName);
      extractedText = `# 📷 Lecture Notes Image: ${baseName}\n\nVisual study notes captured from ${baseName}.\n\n*Note: To enable automatic multimodal handwritten recognition and OCR transcription, configure your GEMINI_API_KEY in server/.env.*`;
    }

    const text = cleanText(extractedText);
    return {
      text,
      pages: [{ pageNumber: 1, text }],
    };
  }

  // TXT and Markdown files
  const raw = fs.readFileSync(filePath, 'utf-8');
  const cleaned = cleanText(raw);
  return {
    text: cleaned,
    pages: [{ pageNumber: 1, text: cleaned }],
  };
}

export function cleanText(input: string): string {
  if (!input) return '';
  return input
    // Replace null bytes and non-printable control chars except \n \r \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Replace carriage returns
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Normalize excessive consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Normalize excessive horizontal spaces
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
