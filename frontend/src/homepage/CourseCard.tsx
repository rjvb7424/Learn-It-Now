// CourseCard.tsx
import {
  Avatar,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

import { auth } from "../firebase/firebase";
import { SignIn } from "../firebase/SignIn";

// 👇 Firestore (for free acquisitions)
import { db } from "../firebase/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const clamp = (lines = 2) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
});

type AcquirePayload = { title: string; price: number; description: string; courseId?: string };

type CourseCardProps = {
  courseId: string;                // 👈 NEW: needed to save a purchase
  author?: string;
  authorInitials?: string;
  avatarUrl?: string;
  date?: string;
  title?: string;
  description?: string;
  price?: number;
  onLearn?: () => void;
  onAcquire?: (payload: AcquirePayload) => void; // used for paid flow
};

export default function CourseCard({
  courseId,
  author = "John Doe",
  authorInitials = "JD",
  avatarUrl,
  date = "September 14, 2021",
  title = "Python Coding for Absolute Beginners",
  description = "Learn Python from scratch and become a proficient programmer with our comprehensive course designed for absolute beginners. Start your coding journey today!",
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

  const ctaLabel = useMemo(
    () => (isFree ? "Get Started — Free" : `Acquire — $${Number(price).toFixed(2)}`),
    [isFree, price]
  );

  const handleLearnClick = () => {
    onLearn?.();
    setOpen(true);
  };

  const handleSignIn = async () => {
    await SignIn();
  };

  const handleAcquire = async () => {
    if (isFree) {
      if (!user) {
        // Shouldn’t happen because dialog shows sign-in prompt when not authed,
        // but guard anyway.
        return;
      }
      try {
        // Save purchase at users/{uid}/purchases/{courseId}
        await setDoc(
          doc(db, "users", user.uid, "purchases", courseId),
          {
            courseId,
            acquiredAt: serverTimestamp(),
            title,
            price: 0,
          },
          { merge: true }
        );
        setOpen(false);
      } catch (e) {
        console.error("Failed to acquire free course:", e);
        // Optional: show a toast/snackbar here
      }
      return;
    }

    // Paid: hand off to parent flow (checkout, etc.)
    onAcquire?.({ title, price: Number(price) || 0, description, courseId });
    setOpen(false);
  };

  return (
    <>
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: 3,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CardHeader
          avatar={<Avatar src={avatarUrl}>{authorInitials}</Avatar>}
          title={author}
          subheader={date}
          sx={{ pt: 2, pb: 0 }}
        />

        <CardContent
          sx={{
            pt: 2,
            pb: 2,
            flexGrow: 1, // keeps actions stuck to bottom
          }}
        >
          <Typography variant="h6" sx={{ mb: 0.5, ...clamp(2) }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={clamp(3)}>
            {description}
          </Typography>
        </CardContent>

        <CardActions
          disableSpacing
          sx={{
            px: 2,
            pt: 0,
            pb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1,
          }}
        >
          <Button size="small" variant="contained" onClick={handleLearnClick}>
            {ctaLabel}
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
                {isFree ? "Get Started" : "Acquire"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
