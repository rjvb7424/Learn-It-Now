// src/utils/courseMapping.ts
import { Timestamp } from "firebase/firestore";
import type { CourseCardData } from "./coursegrid/CourseGrid";

export type FirestoreCourse = {
  title?: string;
  description?: string;
  price?: number;
  isFree?: boolean;
  creatorUid?: string;
  createdAt?: Timestamp | null;
};

export type UserDoc = { displayName?: string; photoURL?: string };

export function initials(name?: string) {
  if (!name) return "CR";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "CR";
}

export function fmtDate(d?: Date | null) {
  return d
    ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—";
}

export function courseToCard(
  id: string,
  c: FirestoreCourse,
  authorName: string,
  authorAvatar?: string,
  purchased?: boolean
): CourseCardData {
  const price = typeof c.price === "number" ? c.price : 0;
  const isFree = c.isFree ?? price === 0;
  return {
    courseId: id,
    title: c.title ?? "Untitled course",
    description: c.description ?? "No description provided.",
    price: isFree ? 0 : price,
    purchased,
    author: authorName || "Creator",
    authorInitials: initials(authorName || "Creator"),
    avatarUrl: authorAvatar,
    date: fmtDate(c.createdAt ? c.createdAt.toDate() : null),
  };
}
