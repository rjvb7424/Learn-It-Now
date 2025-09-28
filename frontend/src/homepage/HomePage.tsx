// External imports
import { Box } from "@mui/material";
import CustomAppBar from "./CustomAppBar";
import CourseGrid from "./CourseGrid";

export default function HomePage() {
  return (
    <Box>
      <CustomAppBar />
      <CourseGrid />
    </Box>
  );
}
