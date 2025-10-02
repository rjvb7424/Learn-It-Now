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
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

import { auth, db } from "../firebase/firebase";
import { SignIn } from "../firebase/SignIn";

// Firestore helpers
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const clamp = (lines = 2) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
});

type AcquirePayload = {
  title: string;
  price: number;
  description: string;
  courseId: string;
};

type CourseCardProps = {
  courseId: string;
  author?: string;
  authorInitials?: string;
  avatarUrl?: string;
  date?: string;
  title?: string;
  description?: string;
  price?: number;
  onAcquire?: (payload: AcquirePayload) => void; // paid path
  onOpenCourse?: (courseId: string) => void; // navigate to course reader
  purchased?: boolean; // optional external override
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
  onAcquire,
  onOpenCourse,
  purchased: purchasedProp,
}: CourseCardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [purchased, setPurchased] = useState<boolean>(!!purchasedProp);
  const [open, setOpen] = useState(false);

  const isFree = !price || Number(price) === 0;

  // Keep local purchased in sync if parent passes it
  useEffect(() => {
    if (typeof purchasedProp === "boolean") setPurchased(purchasedProp);
  }, [purchasedProp]);

  // Track auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Check if user already owns this course
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!purchasedProp) setPurchased(false);
        return;
      }
      // If parent already told us, don't re-check
      if (typeof purchasedProp === "boolean") return;

      try {
        const ref = doc(db, "users", user.uid, "purchases", courseId);
        const snap = await getDoc(ref);
        if (!cancelled) setPurchased(snap.exists());
      } catch (e) {
        console.error("Failed to check purchase:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, courseId, purchasedProp]);

  // Primary CTA click
  const handlePrimaryClick = () => {
    if (purchased) {
      onOpenCourse?.(courseId);
      return;
    }
    // Not owned yet → show dialog with Acquire
    setOpen(true);
  };

  // Sign in from dialog
  const handleSignIn = async () => {
    await SignIn();
    // onAuthStateChanged will update `user`, then the purchase check runs
  };

  // Acquire from dialog
  const handleAcquire = async () => {
    if (!user) return; // guarded by dialog

    if (isFree) {
      try {
        // Save only the timestamp; doc id == course id
        await setDoc(
          doc(db, "users", user.uid, "purchases", courseId),
          { acquiredAt: serverTimestamp() },
          { merge: true }
        );
        setPurchased(true);
        setOpen(false);
        onOpenCourse?.(courseId);
      } catch (e) {
        console.error("Failed to acquire free course:", e);
      }
      return;
    }

    // Paid flow – hand off
    onAcquire?.({
      title,
      price: Number(price) || 0,
      description,
      courseId,
    });
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

        <CardContent sx={{ pt: 2, pb: 2, flexGrow: 1 }}>
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
          <Button size="small" variant="contained" onClick={handlePrimaryClick}>
            {purchased ? "Learn It Now" : "Learn It Now"}
          </Button>
        </CardActions>
      </Card>

      {/* Acquire dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
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
              <Button onClick={() => setOpen(false)}>Close</Button>
              <Button variant="contained" onClick={handleSignIn}>
                Sign In
              </Button>
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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
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
