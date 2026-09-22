import { ExtractedDocument } from './textExtractor.js';

export interface Chunk {
  index: number;
  content: string;
  sectionHeading: string;
  pageNumber: number;
  tokenCount: number;
}

export function chunkDocument(
  extracted: ExtractedDocument,
  maxChunkSize: number = 800,
  overlap: number = 100
): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const page of extracted.pages) {
    const pageText = page.text;
    if (!pageText || pageText.trim().length === 0) continue;

    // Split page text into paragraphs or semantic blocks
    const paragraphs = pageText.split(/\n\n+/);
    let currentChunkText = '';
    let currentHeading = 'General Content';

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      // Check if paragraph starts with or is a heading
      const firstLine = trimmedPara.split('\n')[0].trim();
      if (isHeading(firstLine)) {
        currentHeading = firstLine.replace(/^[#\s*\-]+/, '').trim();
      } else if (isHeading(trimmedPara)) {
        currentHeading = trimmedPara.replace(/^[#\s*\-]+/, '').trim();
      }

      if ((currentChunkText + '\n\n' + trimmedPara).length > maxChunkSize) {
        if (currentChunkText.trim().length > 0) {
          chunks.push({
            index: chunkIndex++,
            content: currentChunkText.trim(),
            sectionHeading: currentHeading,
            pageNumber: page.pageNumber,
            tokenCount: estimateTokens(currentChunkText),
          });

          // Retain overlap from end of current chunk
          const words = currentChunkText.split(/\s+/);
          const overlapWords = words.slice(-Math.floor(overlap / 5)).join(' ');
          currentChunkText = overlapWords + '\n\n' + trimmedPara;
        } else {
          // Paragraph itself exceeds maxChunkSize, split by sentence or slice
          const slices = splitLargeText(trimmedPara, maxChunkSize, overlap);
          for (const slice of slices) {
            chunks.push({
              index: chunkIndex++,
              content: slice.trim(),
              sectionHeading: currentHeading,
              pageNumber: page.pageNumber,
              tokenCount: estimateTokens(slice),
            });
          }
          currentChunkText = '';
        }
      } else {
        currentChunkText = currentChunkText ? `${currentChunkText}\n\n${trimmedPara}` : trimmedPara;
      }
    }

    if (currentChunkText.trim().length > 0) {
      chunks.push({
        index: chunkIndex++,
        content: currentChunkText.trim(),
        sectionHeading: currentHeading,
        pageNumber: page.pageNumber,
        tokenCount: estimateTokens(currentChunkText),
      });
    }
  }

  // Fallback if empty
  if (chunks.length === 0 && extracted.text.trim().length > 0) {
    chunks.push({
      index: 0,
      content: extracted.text.slice(0, maxChunkSize).trim(),
      sectionHeading: 'General Content',
      pageNumber: 1,
      tokenCount: estimateTokens(extracted.text),
    });
  }

  return chunks;
}

function isHeading(text: string): boolean {
  if (text.startsWith('#') || text.startsWith('Chapter') || text.startsWith('Lecture') || text.startsWith('Section') || text.startsWith('Part')) {
    return true;
  }
  // Short line without ending punctuation and capitalized
  if (text.length < 80 && !/[.?!]$/.test(text) && !text.includes('\n')) {
    const words = text.split(/\s+/);
    if (words.length > 0 && words.length <= 10) {
      return true;
    }
  }
  return false;
}

function splitLargeText(text: string, chunkSize: number, overlap: number): string[] {
  const result: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    result.push(text.substring(start, end));
    if (end === text.length) break;
    start += chunkSize - overlap;
  }
  return result;
}

export function estimateTokens(text: string): number {
  // Approximate 1 token ~ 4 characters for English / Bangla
  return Math.ceil(text.length / 4);
}
