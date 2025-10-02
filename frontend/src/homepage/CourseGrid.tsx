// CourseGrid.tsx
import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  collection, onSnapshot, orderBy, query, Timestamp, getDocs, where, documentId,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import CourseCard from "./CourseCard";
import { db, auth } from "../firebase/firebase";

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
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set()); // 👈 add back
  const navigate = useNavigate();

  // Courses subscription
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

  // Purchases subscription for current user 👇
  useEffect(() => {
    let purchasesUnsub: (() => void) | undefined;
    const authUnsub = onAuthStateChanged(auth, (u) => {
      purchasesUnsub?.();
      if (!u) {
        setPurchasedIds(new Set());
        return;
      }
      const ref = collection(db, "users", u.uid, "purchases");
      purchasesUnsub = onSnapshot(
        ref,
        (snap) => {
          const ids = new Set<string>();
          snap.forEach((d) => ids.add(d.id)); // doc.id === courseId
          setPurchasedIds(ids);
        },
        (err) => {
          console.error("Failed to load purchases:", err);
          setPurchasedIds(new Set());
        }
      );
    });
    return () => {
      authUnsub();
      purchasesUnsub?.();
    };
  }, []);

  // Fetch creator profiles when courses change (unchanged)
  useEffect(() => {
    let cancelled = false;
    const allUids = Array.from(new Set(courses.map((c) => c.creatorUid).filter(Boolean) as string[]));
    const missing = allUids.filter((uid) => !fetchedUidsRef.current.has(uid));
    if (missing.length === 0) return;

    (async () => {
      for (let i = 0; i < missing.length; i += 10) {
        const batch = missing.slice(i, i + 10);
        try {
          const snap = await getDocs(query(collection(db, "users"), where(documentId(), "in", batch)));
          const updates: Record<string, UserDoc> = {};
          snap.forEach((doc) => {
            const d = doc.data() as UserDoc;
            updates[doc.id] = { displayName: d.displayName ?? "Creator", photoURL: d.photoURL ?? undefined };
            fetchedUidsRef.current.add(doc.id);
          });
          if (!cancelled && Object.keys(updates).length) setProfiles((prev) => ({ ...prev, ...updates }));
        } catch (e) {
          console.error("Failed to load user profiles batch:", e);
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    })();

    return () => { cancelled = true; };
  }, [courses]);

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

  // No useMemo needed; render directly (avoids navigate dep warning)
  return (
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
          c.createdAt?.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) ?? "—";

        return (
          <CourseCard
            key={c.id}
            courseId={c.id}
            author={name}
            authorInitials={initials}
            avatarUrl={avatarUrl}
            date={date}
            title={c.title}
            description={c.description}
            price={c.isFree ? 0 : c.price}
            purchased={purchasedIds.has(c.id)}               // ✅ now defined
            onOpenCourse={(id) => navigate(`/course/${id}`)}
            onAcquire={({ courseId, title, price }) => {
              console.log("Acquire paid:", courseId, title, price);
              // navigate(`/checkout/${courseId}`)
            }}
          />
        );
      })}
    </Box>
  );
}
