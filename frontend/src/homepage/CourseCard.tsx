// CourseCard.tsx
import {
  Avatar, Card, CardActions, CardContent, CardHeader,
  Typography, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, Divider
} from "@mui/material";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { SignIn } from "../firebase/SignIn";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { MenuBook, AccessTime, Article } from "@mui/icons-material";

const clamp = (lines = 2) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
});

type AcquirePayload = { title: string; price: number; description: string; courseId: string };

type CourseCardProps = {
  courseId: string;
  author?: string;
  authorInitials?: string;
  avatarUrl?: string;
  date?: string;
  title?: string;
  description?: string;
  price?: number;
  onAcquire?: (payload: AcquirePayload) => void | Promise<void>; // paid path
  onOpenCourse?: (courseId: string) => void;     // navigate to reader
  purchased?: boolean;                            // optional override from parent
};

type Lesson = { title: string; content: string };
type Stats = { lessons: number; words: number; minutes: number };

const WORDS_PER_MINUTE = 200;
const countWords = (t: string) => (t?.trim().match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9’']+/g)?.length ?? 0);
const computeStats = (lessons: Lesson[]): Stats => {
  const words = lessons.reduce((s, l) => s + countWords(l.title) + countWords(l.content), 0);
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return { lessons: lessons.length, words, minutes };
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

  // 🔎 size stats from Firestore
  const [stats, setStats] = useState<Stats | null>(null);

  // sync purchased from parent (if provided)
  useEffect(() => {
    if (typeof purchasedProp === "boolean") setPurchased(purchasedProp);
  }, [purchasedProp]);

  // auth
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // check ownership when signed in (only if parent didn't provide it)
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user || typeof purchasedProp === "boolean") return;
      try {
        const ref = doc(db, "users", user.uid, "purchases", courseId);
        const snap = await getDoc(ref);
        if (!cancel) setPurchased(snap.exists());
      } catch (e) {
        console.error("Failed checking purchase:", e);
      }
    })();
    return () => { cancel = true; };
  }, [user, courseId, purchasedProp]);

  // ✅ fetch lessons once and compute size
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const ref = doc(db, "courses", courseId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const data = snap.data() as { lessons?: Lesson[]; stats?: Stats };
        // prefer stored stats if you later add them on publish; else compute now
        const computed = data?.stats ?? computeStats(Array.isArray(data?.lessons) ? data.lessons : []);
        if (!cancel) setStats(computed);
      } catch (e) {
        console.error("Failed loading course for stats:", e);
      }
    })();
    return () => { cancel = true; };
  }, [courseId]);

  // always opens dialog
  const handlePrimaryButton = () => setOpen(true);

  const handleSignIn = async () => {
    await SignIn();
    // onAuthStateChanged will rerun and dialog will remain open
  };

  const acquireFreeAndOpen = async () => {
    if (!user) return;
    try {
      // purchase doc id == course id; store progress seed
      await setDoc(
        doc(db, "users", user.uid, "purchases", courseId),
        { acquiredAt: serverTimestamp(), currentLessonIndex: 0 },
        { merge: true }
      );
      setPurchased(true);
      setOpen(false);
      onOpenCourse?.(courseId);
    } catch (e) {
      console.error("Failed to acquire free course:", e);
    }
  };

  const handleDialogPrimary = async () => {
    if (!user) return; // sign-in panel guards this
    if (purchased) {
      setOpen(false);
      onOpenCourse?.(courseId);
      return;
    }
    if (isFree) {
      acquireFreeAndOpen();
      return;
    }
    try {
      await onAcquire?.({ title, price: Number(price) || 0, description, courseId });
      setOpen(false);
    } catch (e) {
      console.error(e);
      // keep dialog open so the user can retry or see the error
    }
  };

  return (
    <>
      <Card sx={{ borderRadius: 3, boxShadow: 3, height: "100%", display: "flex", flexDirection: "column" }}>
        <CardHeader
          avatar={
            <Avatar
              src={avatarUrl || undefined}
              imgProps={{ referrerPolicy: "no-referrer", loading: "lazy" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = ""; }} // fall back to initials
            >
              {authorInitials}
            </Avatar>
          }
          title={author}
          subheader={date}
          sx={{ pt: 2, pb: 0 }}
        />
        <CardContent sx={{ pt: 2, pb: 2, flexGrow: 1 }}>
          <Typography variant="h6" sx={{ mb: 0.5, ...clamp(2) }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={clamp(3)}>{description}</Typography>

          {/* 📏 Course size row */}
          {stats && (
            <Box sx={{ mt: 1.25, display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                <MenuBook fontSize="small" />
                <Typography variant="caption">
                  {stats.lessons} lesson{stats.lessons === 1 ? "" : "s"}
                </Typography>
              </Box>
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                <AccessTime fontSize="small" />
                <Typography variant="caption">
                  {stats.minutes} min read
                </Typography>
              </Box>
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                <Article fontSize="small" />
                <Typography variant="caption">
                  {stats.words.toLocaleString()} words
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
        <CardActions disableSpacing sx={{ px: 2, pt: 0, pb: 2, display: "flex", justifyContent: "flex-start" }}>
          <Button size="small" variant="contained" onClick={handlePrimaryButton}>
            Learn It Now
          </Button>
        </CardActions>
      </Card>

      {/* Dialog always appears; primary action changes based on ownership/price */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        {!user ? (
          <>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                To access courses you must be signed in.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Close</Button>
              <Button variant="contained" onClick={handleSignIn}>Sign In</Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{description}</Typography>

              {/* 📏 Size recap inside dialog */}
              {stats && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Typography variant="body2">
                      <strong>{stats.lessons}</strong> lesson{stats.lessons === 1 ? "" : "s"}
                    </Typography>
                    <Typography variant="body2">•</Typography>
                    <Typography variant="body2">
                      ~<strong>{stats.minutes}</strong> min read
                    </Typography>
                    <Typography variant="body2">•</Typography>
                    <Typography variant="body2">
                      <strong>{stats.words.toLocaleString()}</strong> words
                    </Typography>
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {purchased ? "You own this course" : isFree ? "Free" : `Price: €${Number(price).toFixed(2)}`}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Close</Button>
              <Button variant="contained" onClick={handleDialogPrimary}>
                {purchased ? "Continue" : isFree ? "Get Started" : "Acquire"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
