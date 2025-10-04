import { Box, TextField } from "@mui/material";
import { useState } from "react";

type Props = {
  onSearch?: (q: string) => void;
};

export default function SearchBar({ onSearch }: Props) {
  const [value, setValue] = useState("");

  return (
    <Box
      sx={{
        width: 1,
        // IMPORTANT: allow the TextField to actually shrink inside flex/grid parents
        minWidth: 0,
        maxWidth: 500,
      }}
    >
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
          bgcolor: "white",
          borderRadius: 2,
          // keep height reasonable as we scale down
          "& .MuiInputBase-input": { py: 1.1 },
        }}
      />
    </Box>
  );
}
