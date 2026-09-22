import { query } from '../db/connection.js';

export interface RetrievedChunk {
  id: string;
  material_id: string;
  chunk_index: number;
  content: string;
  section_heading: string;
  page_number: number;
  similarity: number;
  material_title?: string;
  material_filename?: string;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generates a normalized term-frequency sparse vector mapped to a fixed-hash dimension for offline similarity
export function generateLocalTfidfVector(text: string, dimensions: number = 256): number[] {
  const vector = new Array(dimensions).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u0980-\u09FF]/g, ' ') // Supports English and Bangla unicode characters
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return vector;

  const wordCounts: Record<string, number> = {};
  for (const word of words) {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }

  for (const [word, count] of Object.entries(wordCounts)) {
    // Hash word to dimension index
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    const tf = count / words.length;
    vector[idx] += tf;
  }

  // Normalize
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  if (norm > 0) {
    const sqrtNorm = Math.sqrt(norm);
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= sqrtNorm;
    }
  }

  return vector;
}

export function searchSimilarChunks(
  queryText: string,
  queryVector: number[] | null,
  options: {
    materialId?: string;
    subjectId?: string;
    userId: string;
    topK?: number;
    minSimilarity?: number;
  }
): RetrievedChunk[] {
  const topK = options.topK || 5;
  const minSimilarity = options.minSimilarity || 0.15;

  let sql = `
    SELECT 
      c.id, c.material_id, c.chunk_index, c.content, c.section_heading, c.page_number, c.embedding_json,
      m.title AS material_title, m.filename AS material_filename
    FROM document_chunks c
    JOIN materials m ON c.material_id = m.id
    WHERE m.user_id = ?
  `;
  const params: any[] = [options.userId];

  if (options.materialId) {
    sql += ' AND m.id = ?';
    params.push(options.materialId);
  } else if (options.subjectId) {
    sql += ' AND m.subject_id = ?';
    params.push(options.subjectId);
  }

  const rows = query<any>(sql, params);
  if (rows.length === 0) return [];

  // If queryVector is provided, calculate cosine similarity
  // Else compute using local vectorizer
  const effectiveQueryVector = queryVector || generateLocalTfidfVector(queryText);

  const scoredChunks: RetrievedChunk[] = [];

  for (const row of rows) {
    let chunkVector: number[] | null = null;
    if (row.embedding_json) {
      try {
        chunkVector = JSON.parse(row.embedding_json);
      } catch {
        chunkVector = null;
      }
    }

    // If chunkVector is missing or dimensional mismatch with queryVector, generate local vector
    if (!chunkVector || chunkVector.length !== effectiveQueryVector.length) {
      chunkVector = generateLocalTfidfVector(row.content + ' ' + (row.section_heading || ''));
    }

    let similarity = cosineSimilarity(effectiveQueryVector, chunkVector);

    // Boost score if keyword matches exist in content or heading
    const queryKeywords = queryText.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    let keywordHits = 0;
    const contentLower = row.content.toLowerCase();
    for (const kw of queryKeywords) {
      if (contentLower.includes(kw)) keywordHits++;
    }
    if (keywordHits > 0) {
      similarity = Math.min(1.0, similarity + 0.1 * (keywordHits / Math.max(queryKeywords.length, 1)));
    }

    if (similarity >= minSimilarity) {
      scoredChunks.push({
        id: row.id,
        material_id: row.material_id,
        chunk_index: row.chunk_index,
        content: row.content,
        section_heading: row.section_heading,
        page_number: row.page_number,
        similarity,
        material_title: row.material_title,
        material_filename: row.material_filename,
      });
    }
  }

  // Sort descending by similarity
  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  return scoredChunks.slice(0, topK);
}
