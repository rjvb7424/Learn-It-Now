// CoursePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, Card, CardContent, Container, Typography } from "@mui/material";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import CustomAppBar from "../components/customappbar/CustomAppBar";

type Lesson = { title: string; content: string };
type CourseDoc = {
  title?: string;
  description?: string;
  lessons?: Lesson[];
  creatorUid?: string;
};

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [userUid, setUserUid] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolvedIndex, setResolvedIndex] = useState(false); // ✅ gate initial render

  // auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/");
      else setUserUid(u.uid);
    });
    return () => unsub();
  }, [navigate]);

  // live course doc
  useEffect(() => {
    if (!courseId) return;
    const ref = doc(db, "courses", courseId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        navigate("/");
        return;
      }
      setCourse(snap.data() as CourseDoc);
    });
    return () => unsub();
  }, [courseId, navigate]);

  // Memoize lessons to satisfy exhaustive-deps
  const lessons = useMemo<Lesson[]>(() => course?.lessons ?? [], [course]);

  // Load and clamp progress ONCE we know lessons.length
  useEffect(() => {
    (async () => {
      if (!userUid || !courseId) return;
      if (lessons.length === 0) return; // wait until course (and lessons) loaded

      const pref = doc(db, "users", userUid, "purchases", courseId);
      const psnap = await getDoc(pref);
      if (!psnap.exists()) {
        navigate("/");
        return;
      }

      const idx =
        typeof psnap.data()?.currentLessonIndex === "number"
          ? psnap.data()!.currentLessonIndex
          : 0;

      const clamped = Math.max(0, Math.min(idx, Math.max(0, lessons.length - 1)));
      setCurrentIndex(clamped);
      setResolvedIndex(true); // ✅ now we can render the lesson
    })();
  }, [userUid, courseId, lessons.length, navigate]);

  const saveProgress = async (idx: number) => {
    if (!userUid || !courseId) return;
    const pref = doc(db, "users", userUid, "purchases", courseId);
    await setDoc(pref, { currentLessonIndex: idx }, { merge: true });
  };

  const current = useMemo(() => lessons[currentIndex] ?? null, [lessons, currentIndex]);

  // ✅ Do not render the lesson view until both course and progress index are ready
  if (!course || !resolvedIndex || !current) {
    return (
      <Box>
        <CustomAppBar showSearch={false} />
        <Container sx={{ py: 4 }}>
          <Typography variant="body2">Loading course…</Typography>
        </Container>
      </Box>
    );
  }

  const onNext = async () => {
    const next = Math.min(currentIndex + 1, lessons.length - 1);
    setCurrentIndex(next);
    await saveProgress(next);
  };

  const onPrevious = async () => {
    const previous = Math.max(currentIndex - 1, 0); // ✅ fixed clamp
    setCurrentIndex(previous);
    await saveProgress(previous);
  };

  return (
    <Box>
      <CustomAppBar showSearch={false} />
      <Container sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {course.title ?? "Course"}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Lesson {currentIndex + 1} of {lessons.length}
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {current.title}
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              {current.content}
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" disabled={currentIndex === lessons.length - 1} onClick={onNext}>
            Next Lesson
          </Button>
          <Button variant="outlined" disabled={currentIndex === 0} onClick={onPrevious}>
            Previous Lesson
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
