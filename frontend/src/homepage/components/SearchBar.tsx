// src/homepage/SearchBar.tsx
import { Box, TextField } from "@mui/material";
import { useEffect, useState } from "react";

type Props = {
  initialValue?: string;          // 👈 new
  onSearch?: (q: string) => void;
};

export default function SearchBar({ initialValue = "", onSearch }: Props) {
  const [value, setValue] = useState(initialValue);

  // keep the field in sync if the parent changes the value (e.g., back/forward nav)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Box sx={{ width: 1, minWidth: 0, maxWidth: 500 }}>
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
          borderRadius: 2,
        }}
      />
    </Box>
  );
}
