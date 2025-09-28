// CourseGrid.jsx
import { Box } from "@mui/material";
import CourseCard from "./CourseCard";

// Example data — replace with your real course list
const sampleCourses = Array.from({ length: 36 }).map((_, i) => ({
  id: i + 1,
  author: `John Doe`,
  authorInitials: "JD",
  date: "Sep 14, 2021",
  title: `Python Coding for Absolute Beginners ${String(i + 1).padStart(2, "0")}`,
  description:
    "Learn Python from scratch and become a proficient programmer with our comprehensive course designed for absolute beginners. Start your coding journey today!",
  image: "", // leave empty to show the neutral placeholder
  likes: `${(Math.floor(Math.random() * 19) + 1).toString()}K`,
}));

export default function CourseGrid({ courses = sampleCourses }) {
  return (
    <Box
      sx={(theme) => ({
        px: 3, // your preferred paddingX
        py: 4,
        display: "grid",
        gap: 3,
        // Responsive, fluid grid:
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        // Keep content neatly aligned on very large screens:
        maxWidth: "1600px",
        mx: "auto",
        [theme.breakpoints.up("sm")]: {
          gap: 3,
        },
        [theme.breakpoints.up("md")]: {
          gap: 3,
        },
      })}
    >
      {courses.map((c) => (
        <CourseCard key={c.id} {...c} />
      ))}
    </Box>
  );
}
