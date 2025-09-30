// Example data
const sampleCourses = Array.from({ length: 36 }).map((_, i) => ({
  id: i + 1,
  author: `John Doe`,
  authorInitials: "JD",
  date: "Sep 14, 2021",
  title: `Python Coding for Absolute Beginners ${String(i + 1).padStart(2, "0")}`,
  description:
    "Learn Python from scratch and become a proficient programmer with our comprehensive course designed for absolute beginners. Start your coding journey today!",
  image: "",
  likes: `${(Math.floor(Math.random() * 19) + 1).toString()}K`,
}));

// External imports
import { Box } from "@mui/material";

// Internal imports
import CourseCard from "./CourseCard";

export default function CourseGrid({ courses = sampleCourses }) {
    return (
        <Box
            sx={{
                px: 3,
                py: 3,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
                gap: 3,
            }}>
            {courses.map((c) => (
                    <CourseCard
                    key={c.id}
                    {...c}
                    price={0} // or 19.99
                    onAcquire={({ title, price }) => {
                      // navigate to checkout / enroll
                      console.log("Acquire:", title, price);
                    }}
                  />
                ))}
        </Box>
    );
}

