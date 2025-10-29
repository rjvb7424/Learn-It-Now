// src/utils/courseStats.ts
export type Lesson = { title: string; content: string };

export type CourseStats = {
  lessons: number;     // e.g. 12
  words: number;       // e.g. 3250
  minutes: number;     // e.g. 16 (rounded up)
};

const WORDS_PER_MINUTE = 200;

const countWords = (text: string) => {
  // counts sequences of letters/numbers/apostrophes as words
  const matches = text.trim().match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9’']+/g);
  return matches ? matches.length : 0;
};

export function computeCourseStats(lessons: Lesson[]): CourseStats {
  const lessonsCount = lessons.length;
  const totalWords = lessons.reduce((sum, l) => sum + countWords(l.title) + countWords(l.content), 0);
  const estMinutes = Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE));
  return { lessons: lessonsCount, words: totalWords, minutes: estMinutes };
}
