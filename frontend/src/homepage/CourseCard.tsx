// CourseCard.jsx
import { Avatar, Card, CardActions, CardContent, CardHeader, IconButton,Typography,
  Button,
  Box,
} from "@mui/material";
import { Favorite, Share } from "@mui/icons-material";

// Small helper to clamp text to a fixed number of lines
const clamp = (lines = 2) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

export default function CourseCard({
  author = "John Doe",
  authorInitials = "JD",
  date = "September 14, 2021",
  title = "Python Coding for Absolute Beginners",
  description = "Learn Python from scratch and become a proficient programmer with our comprehensive course designed for absolute beginners. Start your coding journey today!",
  likes = "13K",
  onLearn = () => {},
}) {
    return (
        <Card sx={{ borderRadius: 3, boxShadow: 3, }}>
            {/* Header */}
            <CardHeader
                avatar={<Avatar>{authorInitials}</Avatar>}
                title={author}
                subheader={date}
            />

        {/* Content */}
        <CardContent sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ mb: 0.5, ...clamp(2) }}>
            {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={clamp(3)}>
            {description}
            </Typography>
        </CardContent>

      {/* Actions */}
      <CardActions
        disableSpacing
        sx={{
          px: 2,
          pb: 2,
          pt: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="body2" sx={{ mr: 0.5 }}>
            {likes}
          </Typography>
          <IconButton size="small">
            <Favorite fontSize="small" />
          </IconButton>
          <IconButton size="small">
            <Share fontSize="small" />
          </IconButton>
        </Box>

        <Button size="small" variant="contained" onClick={onLearn}>
          Learn It Now!
        </Button>
      </CardActions>
    </Card>
  );
}
