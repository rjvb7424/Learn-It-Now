export type Lesson = {
  id: string;
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
  title: 50,
  description: 200,
  lessonTitle: 50,
  lessonContent: 500,
  maxLessons: 5,
  maxPrice: 100,
};

export type Errors = Partial<{
  title: string;
  description: string;
  lessons: string;
  lessonFields: string;
  price: string;
}>;
