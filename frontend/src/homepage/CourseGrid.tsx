// CourseGrid.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { collection, onSnapshot, orderBy, query, Timestamp, getDocs, where, documentId } from "firebase/firestore";
import CourseCard from "./CourseCard";
import { db } from "../firebase/firebase";

type FirestoreCourse = {
  title?: string;
  description?: string;
  price?: number;
  isFree?: boolean;
  creatorUid?: string;
  createdAt?: Timestamp | null;
};

type CourseRow = {
  id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  creatorUid?: string;
  createdAt?: Date | null;
};

type UserDoc = {
  displayName?: string;
  photoURL?: string;
};

function getInitials(name?: string) {
  if (!name) return "CR";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "CR";
}

export default function CourseGrid() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserDoc>>({});
  const fetchedUidsRef = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Subscribe to courses
  useEffect(() => {
    const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: CourseRow[] = snap.docs.map((doc) => {
          const d = doc.data() as FirestoreCourse;
          return {
            id: doc.id,
            title: d.title ?? "Untitled course",
            description: d.description ?? "No description provided.",
            price: typeof d.price === "number" ? d.price : 0,
            isFree: d.isFree ?? (typeof d.price === "number" ? d.price === 0 : true),
            creatorUid: d.creatorUid,
            createdAt: d.createdAt ? d.createdAt.toDate() : null,
          };
        });
        setCourses(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load courses:", err);
        setCourses([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Fetch creator profiles ONLY when courses change, never on profiles change
useEffect(() => {
  let cancelled = false;

  // unique list of creator UIDs from current courses
  const allUids = Array.from(
    new Set(courses.map((c) => c.creatorUid).filter(Boolean) as string[])
  );

  // only fetch ones we don't already have
  const missing = allUids.filter((uid) => !fetchedUidsRef.current.has(uid));
  if (missing.length === 0) return;

  (async () => {
    for (let i = 0; i < missing.length; i += 10) {
      const batch = missing.slice(i, i + 10);
      try {
        const snap = await getDocs(
          query(collection(db, "users"), where(documentId(), "in", batch))
        );

        const updates: Record<string, UserDoc> = {};
        snap.forEach((doc) => {
          const data = doc.data() as UserDoc;
          updates[doc.id] = {
            displayName: data.displayName ?? "Creator",
            photoURL: data.photoURL ?? undefined,
          };
          fetchedUidsRef.current.add(doc.id); // mark as fetched
        });

        if (!cancelled && Object.keys(updates).length) {
          setProfiles((prev) => ({ ...prev, ...updates }));
        }
      } catch (e) {
        console.error("Failed to load user profiles batch:", e);
      }

      // tiny backoff to avoid 429s when many batches
      await new Promise((r) => setTimeout(r, 50));
    }
  })();

  return () => {
    cancelled = true;
  };
}, [courses]);

  const grid = useMemo(
    () => (
      <Box
        sx={{
          px: 3,
          py: 3,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
          gap: 3,
        }}
      >
        {courses.map((c) => {
          const prof = c.creatorUid ? profiles[c.creatorUid] : undefined;
          const name = prof?.displayName ?? "Creator";
          const avatarUrl = prof?.photoURL;
          const initials = getInitials(name);
          const date =
            c.createdAt?.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            }) ?? "—";

          return (
            <CourseCard
              key={c.id}
              author={name}
              authorInitials={initials}
              avatarUrl={avatarUrl}
              date={date}
              title={c.title}
              description={c.description}
              price={c.isFree ? 0 : c.price}
              onAcquire={({ title, price }) => {
                console.log("Acquire:", title, price, "courseId:", c.id);
                // e.g. navigate(`/checkout/${c.id}`)
              }}
            />
          );
        })}
      </Box>
    ),
    [courses, profiles]
  );

  if (loading) {
    return (
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="body2">Loading courses…</Typography>
      </Box>
    );
  }

  if (courses.length === 0) {
    return (
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="body2">No courses yet.</Typography>
      </Box>
    );
  }

  return grid;
}
