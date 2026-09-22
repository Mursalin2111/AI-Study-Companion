export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';

export interface SM2State {
  interval: number; // in days
  repetition: number;
  easeFactor: number; // default 2.5
  dueDate: string; // YYYY-MM-DD
}

export function calculateSM2(
  currentState: { interval: number; repetition: number; easeFactor: number },
  rating: FlashcardRating
): SM2State {
  let { interval, repetition, easeFactor } = currentState;
  if (!easeFactor || easeFactor < 1.3) easeFactor = 2.5;

  let quality = 4;
  switch (rating) {
    case 'again':
      quality = 0;
      break;
    case 'hard':
      quality = 3;
      break;
    case 'good':
      quality = 4;
      break;
    case 'easy':
      quality = 5;
      break;
  }

  // Update repetition and interval based on SM-2 rules
  if (quality < 3) {
    // Failed recall
    repetition = 0;
    interval = 1;
  } else {
    // Successful recall
    if (repetition === 0) {
      interval = rating === 'easy' ? 4 : 1;
    } else if (repetition === 1) {
      interval = rating === 'easy' ? 8 : 6;
    } else {
      const bonusMultiplier = rating === 'easy' ? 1.3 : 1.0;
      interval = Math.round(interval * easeFactor * bonusMultiplier);
    }
    repetition += 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate new due date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const dueDate = nextDate.toISOString().split('T')[0];

  return {
    interval,
    repetition,
    easeFactor: Math.round(easeFactor * 100) / 100,
    dueDate,
  };
}
