// CourseCard.tsx
import {
  Avatar,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import { Favorite, Share } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

import { auth } from "../firebase/firebase";
import { SignIn } from "../firebase/SignIn";

const clamp = (lines = 2) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
});

type AcquirePayload = { title: string; price: number; description: string };

type CourseCardProps = {
  author?: string;
  authorInitials?: string;
  avatarUrl?: string;       // 👈 NEW
  date?: string;
  title?: string;
  description?: string;
  likes?: string;
  price?: number;
  onLearn?: () => void;
  onAcquire?: (payload: AcquirePayload) => void;
};

export default function CourseCard({
  author = "John Doe",
  authorInitials = "JD",
  avatarUrl,                 // 👈 NEW
  date = "September 14, 2021",
  title = "Python Coding for Absolute Beginners",
  description = "Learn Python from scratch and become a proficient programmer with our comprehensive course designed for absolute beginners. Start your coding journey today!",
  likes = "13K",
  price = 0,
  onLearn,
  onAcquire,
}: CourseCardProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const isFree = !price || Number(price) === 0;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsub();
  }, []);

  const handleLearnClick = () => {
    onLearn?.();
    setOpen(true);
  };

  const handleSignIn = async () => {
    await SignIn();
  };

  const handleAcquire = () => {
    onAcquire?.({ title, price: Number(price) || 0, description });
    setOpen(false);
  };

  return (
    <>
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardHeader
          avatar={<Avatar src={avatarUrl}>{authorInitials}</Avatar>}
          title={author}
          subheader={date}
        />

        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ mb: 0.5, ...clamp(2) }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={clamp(3)}>
            {description}
          </Typography>
        </CardContent>

        <CardActions
          disableSpacing
          sx={{ px: 2, pb: 2, pt: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}
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

          <Button size="small" variant="contained" onClick={handleLearnClick}>
            Learn It Now!
          </Button>
        </CardActions>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        {!user ? (
          <>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                To access courses you must be signed in.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create an account or sign in to continue.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleSignIn}>Sign In</Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {isFree ? "Free" : `Price: $${Number(price).toFixed(2)}`}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Close</Button>
              <Button variant="contained" onClick={handleAcquire}>
                {isFree ? "Get Course" : "Acquire Course"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
