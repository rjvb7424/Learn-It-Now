// src/components/PageHeader.tsx
import { Box, Typography } from "@mui/material";

type Props = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <Box
      sx={{
        px: 2,
        py: 2,
        backgroundColor: (t) => t.palette.background.paper,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",   // center horizontally
        textAlign: "center",    // center text
      }}
    >
      <Typography
        variant="h4" // bigger title
        sx={{ fontWeight: 700, lineHeight: 1.3 }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="subtitle1" // larger than body2
          sx={{ color: "text.secondary", mt: 1 }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
