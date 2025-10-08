import { Card, CardContent, Typography, Divider, Box } from "@mui/material";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import ReportGmailerrorredOutlinedIcon from "@mui/icons-material/ReportGmailerrorredOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

export default function PolicyNotice() {
  return (
    <Card sx={{ mb: 2.5, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <GavelOutlinedIcon fontSize="small" />
          Before you publish
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          By creating a course, you agree to our{" "}
          <Typography
            component="a"
            href="/terms"
            color="primary"
            variant="body2"
            sx={{ fontWeight: 600 }}
          >
            Terms of Service
          </Typography>{" "}
          and accept any actions taken for violations.
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReportGmailerrorredOutlinedIcon fontSize="small" />
            Courses that infringe the Terms of Service may be removed without notice.
          </Typography>
          <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BlockOutlinedIcon fontSize="small" />
            Publishing is final: courses cannot be edited or deleted after creation.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
