import { Box, TextField } from "@mui/material";
import { useState } from "react";

type Props = {
  onSearch?: (q: string) => void;
};

export default function SearchBar({ onSearch }: Props) {
  const [value, setValue] = useState("");

  return (
    <Box sx={{ width: "min(500px, calc(100vw - 32px))" }}>
      <TextField
        placeholder="Search..."
        variant="outlined"
        size="small"
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch?.(value.trim());
        }}
        sx={{
          backgroundColor: "white",
          borderRadius: 2,
        }}
      />
    </Box>
  );
}
