import { describe, it, expect } from 'vitest';
import { calculateSM2 } from '../src/services/spacedRepetition.js';

describe('Spaced Repetition SM-2 Tests', () => {
  it('should reset interval on failed recall (again)', () => {
    const initialState = { interval: 10, repetition: 4, easeFactor: 2.5 };
    const next = calculateSM2(initialState, 'again');

    expect(next.interval).toBe(1);
    expect(next.repetition).toBe(0);
    expect(next.easeFactor).toBeLessThanOrEqual(2.5);
  });

  it('should increase interval on good recall', () => {
    const step1 = calculateSM2({ interval: 0, repetition: 0, easeFactor: 2.5 }, 'good');
    expect(step1.interval).toBe(1);
    expect(step1.repetition).toBe(1);

    const step2 = calculateSM2(step1, 'good');
    expect(step2.interval).toBe(6);
    expect(step2.repetition).toBe(2);

    const step3 = calculateSM2(step2, 'good');
    expect(step3.interval).toBeGreaterThanOrEqual(15);
    expect(step3.repetition).toBe(3);
  });

  it('should award bonus interval and higher ease factor on easy recall', () => {
    const easyStep = calculateSM2({ interval: 0, repetition: 0, easeFactor: 2.5 }, 'easy');
    expect(easyStep.interval).toBe(4);
    expect(easyStep.easeFactor).toBeGreaterThan(2.5);
  });
});
