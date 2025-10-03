// src/pages/AcquiredCoursesPage.tsx
import { Box, Typography } from "@mui/material";
import CustomAppBar from "./components/customappbar/CustomAppBar";
import CourseGrid from "./components/CourseGrid";

export default function AcquiredCoursesPage() {
  return (
    <Box>
      <CustomAppBar />
      <Box sx={{ px: 3, pt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Acquired courses</Typography>
        <CourseGrid source="purchased" emptyText="You haven’t acquired any courses yet." />
      </Box>
    </Box>
  );
}
