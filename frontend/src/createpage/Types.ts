export type Lesson = {
  title: string;
  content: string;
};

export type Limits = {
  title: number;
  description: number;
  lessonTitle: number;
  lessonContent: number;
  maxLessons: number;
  maxPrice: number;
};

export const LIMITS: Limits = {
  title: 45,
  description: 180,
  lessonTitle: 50,
  lessonContent: 500,
  maxLessons: 8,
  maxPrice: 100,
};

export type Errors = Partial<{
  title: string;
  description: string;
  lessons: string;
  lessonFields: string;
  price: string;
}>;
