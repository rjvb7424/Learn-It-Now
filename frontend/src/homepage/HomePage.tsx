// HomePage.tsx
import { Box } from "@mui/material";
import CustomAppBar from "../components/CustomAppBar";
import CourseGrid from "./CourseGrid";
import SearchOverlay from "./SearchBar";

export default function HomePage() {
  return (
    <Box>
      <Box sx={{ position: "relative" }}>
        {/* Base app bar (logo + auth) */}
        <CustomAppBar />

        {/* Overlay only the search box (not a full bar) */}
        <Box
          sx={{
            position: "absolute",
            top: 11,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: (t) => t.zIndex.appBar + 1, // above the base bar
          }}
        >
          <SearchOverlay onSearch={(q) => {
            if (!q) return;
            // TODO: navigate to your results page or trigger search logic
            // e.g., navigate(`/search?q=${encodeURIComponent(q)}`)
            console.log("search:", q);
          }} />
        </Box>
      </Box>

      <CourseGrid />
    </Box>
  );
}
