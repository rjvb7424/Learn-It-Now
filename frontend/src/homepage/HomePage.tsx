// External imports
import { Box } from "@mui/material";
import CustomAppBar from "../components/CustomAppBar";
import CourseGrid from "./CourseGrid";
import SearchAppBar from "./SearchAppBar";

export default function HomePage() {
  return (
    <Box>
          <Box sx={{ position: "relative" }}>
      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1201 }}>
        <SearchAppBar />
      </Box>
      <CustomAppBar />
    </Box>
    <CourseGrid />
    </Box>
  );
}
