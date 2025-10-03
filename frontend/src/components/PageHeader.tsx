// src/components/PageHeader.tsx
import { Box, Typography } from "@mui/material";

type Props = {
  title: string;        // e.g., "Home Page", "Purchases", "Created Courses"
  subtitle?: string;    // optional small helper line
};

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderBottom: (t) => `1px solid ${t.palette.divider}`,
        backgroundColor: (t) => t.palette.background.paper,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
