// src/pages/MyCoursesPage.tsx
import { Box, Typography } from "@mui/material";
import CustomAppBar from "./components/customappbar/CustomAppBar.tsx";
import CourseGrid from "./components/CourseGrid";

export default function MyCoursesPage() {
  return (
    <Box>
      <CustomAppBar />
      <Box sx={{ px: 3, pt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Your created courses</Typography>
        <CourseGrid source="authored" emptyText="You haven’t created any courses yet." />
      </Box>
    </Box>
  );
}
