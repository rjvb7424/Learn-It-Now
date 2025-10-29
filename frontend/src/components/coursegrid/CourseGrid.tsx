// external imports
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useMemo, useRef } from "react";

// internal imports
import CourseCard from "./CourseCard";
import type { CourseCardData } from "./CourseCardData";

type Props = {
  items: CourseCardData[];
  loading?: boolean;
  emptyText?: string;
  showSignInPrompt?: boolean;
  onSignInClick?: () => void;
  onOpenCourse?: (id: string) => void;
  onAcquire?: (args: { courseId: string; title: string; price: number }) => void;
};

// CourseGrid component to display a grid of course cards.
export default function CourseGrid({ items, emptyText = "No courses yet.", showSignInPrompt = false, onSignInClick, onOpenCourse, onAcquire, }: Props) {
  const navigate = useNavigate();

  // --- Seeded RNG so order is stable for the session (changes on full reload) ---
  const seedRef = useRef<number>(Math.floor(Math.random() * 2 ** 31));
  const rng = useMemo(() => {
    // Mulberry32 PRNG
    let t = seedRef.current >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }, []);
  
  const shuffled = useMemo(() => {
    // Fisher–Yates using the seeded RNG
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [items, rng]);

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
      {shuffled.map((c) => (
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
