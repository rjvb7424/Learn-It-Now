// src/components/CourseGrid.tsx
import { Box, Typography, Button } from "@mui/material";
import CourseCard from "../homepage/CourseCard";
import { useNavigate } from "react-router-dom";
import type { CourseStats } from "../homepage/courseStats.ts";

export type CourseCardData = {
  courseId: string;
  title: string;
  description: string;
  price: number;       // 0 if free
  purchased?: boolean; // optional
  author: string;
  authorInitials: string;
  avatarUrl?: string;
  date: string;        // preformatted (e.g., "Oct 3, 2025")
  stats?: CourseStats;
};

type Props = {
  items: CourseCardData[];
  loading?: boolean;
  emptyText?: string;
  showSignInPrompt?: boolean;
  onSignInClick?: () => void;
  onOpenCourse?: (id: string) => void;
  onAcquire?: (args: { courseId: string; title: string; price: number }) => void;
};

export default function CourseGrid({
  items,
  emptyText = "No courses yet.",
  showSignInPrompt = false,
  onSignInClick,
  onOpenCourse,
  onAcquire,
}: Props) {
  const navigate = useNavigate();

  if (showSignInPrompt) {
    return (
      <Box sx={{ px: 3, py: 6, textAlign: "center" }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Please sign in to view this list.
        </Typography>
        <Button variant="outlined" onClick={onSignInClick ?? (() => navigate("/signin"))}>
          Sign in
        </Button>
      </Box>
    );
  }

  if (!items.length) {
    return (
      <Box sx={{ px: 3, py: 6, textAlign: "center" }}>
        <Typography variant="body2">{emptyText}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        px: 3,
        py: 3,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
        gap: 3,
      }}
    >
      {items.map((c) => (
        <CourseCard
          key={c.courseId}
          courseId={c.courseId}
          author={c.author}
          authorInitials={c.authorInitials}
          avatarUrl={c.avatarUrl}
          date={c.date}
          title={c.title}
          description={c.description}
          price={c.price}
          purchased={!!c.purchased}
          stats={c.stats}
          onOpenCourse={(id) => (onOpenCourse ? onOpenCourse(id) : navigate(`/course/${id}`))}
          onAcquire={(args) => onAcquire?.(args)}
        />
      ))}
    </Box>
  );
}
