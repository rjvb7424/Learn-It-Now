// External imports
import { AppBar, Toolbar, TextField, Box } from "@mui/material";

export default function SearchAppBar() {
  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "transparent",
        boxShadow: "none",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "center" }}>
        {/* Empty left space for logo later */}
        <Box sx={{ width: 120 }} />

        {/* Search bar in the middle */}
        <TextField
          placeholder="Search..."
          variant="outlined"
          size="small"
          sx={{
            flexGrow: 1,
            maxWidth: "500px",
            mx: "auto",
            backgroundColor: "white",
            borderRadius: 2,
          }}
        />

        {/* Empty right space to keep centered */}
        <Box sx={{ width: 120 }} />
      </Toolbar>
    </AppBar>
  );
}
