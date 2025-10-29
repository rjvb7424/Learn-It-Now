import type { CourseStats } from "../../homepage/components/courseStats";

export type CourseCardData = {
  courseId: string;
  title: string;
  description: string;
  price: number;
  purchased?: boolean;
  author: string;
  authorInitials: string;
  avatarUrl?: string;
  date: string;
  stats?: CourseStats;
};