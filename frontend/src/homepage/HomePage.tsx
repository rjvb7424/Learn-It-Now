// src/pages/HomePage.tsx
import { Box } from "@mui/material";
import CustomAppBar from "../components/customappbar/CustomAppBar";
import CourseGrid from "../components/CourseGrid";
import SearchOverlay from ".//SearchBar";

export default function HomePage() {
  return (
    <Box>
      <Box sx={{ position: "relative" }}>
        <CustomAppBar />
        <Box
          sx={{
            position: "absolute",
            top: 11,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: (t) => t.zIndex.appBar + 1,
          }}
        >
          <SearchOverlay onSearch={(q) => {
            if (!q) return;
            console.log("search:", q);
          }} />
        </Box>
      </Box>

      <CourseGrid source="all" />
    </Box>
  );
}
