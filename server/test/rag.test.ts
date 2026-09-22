import { describe, it, expect } from 'vitest';
import { chunkDocument } from '../src/services/chunker.js';
import { cosineSimilarity, generateLocalTfidfVector, searchSimilarChunks } from '../src/services/vectorStore.js';

describe('RAG & Vector Retrieval Tests', () => {
  it('should calculate accurate cosine similarity between identical and orthogonal vectors', () => {
    const vecA = [1, 0, 0, 1];
    const vecB = [1, 0, 0, 1];
    const vecC = [0, 1, 1, 0];

    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 4);
    expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0, 4);
  });

  it('should chunk a multi-page document and detect section headings', () => {
    const mockDoc = {
      text: '### Introduction to Lexical Analysis\nTokens are generated here.\n\n### Top-Down Parsing\nLL(1) rules apply here.',
      pages: [
        { pageNumber: 1, text: '### Introduction to Lexical Analysis\nTokens are generated here.' },
        { pageNumber: 2, text: '### Top-Down Parsing\nLL(1) rules apply here.' },
      ],
    };

    const chunks = chunkDocument(mockDoc, 300, 50);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].sectionHeading).toBe('Introduction to Lexical Analysis');
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[1].sectionHeading).toBe('Top-Down Parsing');
    expect(chunks[1].pageNumber).toBe(2);
  });

  it('should retrieve relevant chunk for semantic query', () => {
    const results = searchSimilarChunks('lexical analysis tokens DFA', null, {
      userId: 'student-demo-user-id',
      topK: 3,
      minSimilarity: 0.1,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content.toLowerCase()).toContain('lexical');
    expect(results[0]).toHaveProperty('similarity');
    expect(results[0]).toHaveProperty('page_number');
  });
});
