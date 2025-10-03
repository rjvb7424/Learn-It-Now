// src/pages/AcquiredCoursesPage.tsx
import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  collection,
  onSnapshot,
  query,
  where,
  documentId,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CustomAppBar from "./components/customappbar/CustomAppBar";
import CourseGrid from "./components/CourseGrid";
import { db, auth } from "./firebase/firebase";
import { courseToCard } from "./components/courseMapping";
import type { FirestoreCourse } from "./components/courseMapping";
import type { UserDoc } from "./components/courseMapping";

export default function AcquiredCoursesPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<ReturnType<typeof courseToCard>[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, UserDoc>>({});
  const fetchedUidsRef = useRef<Set<string>>(new Set());

  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Subscribe to purchase IDs; fetch course docs in batches when it changes
    const purchasesRef = collection(db, "users", uid, "purchases");
    const unsub = onSnapshot(
      purchasesRef,
      async (snap) => {
        setLoading(true);
        const ids = snap.docs.map((d) => d.id);
        if (ids.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        const rows: { id: string; data: FirestoreCourse }[] = [];
        for (let i = 0; i < ids.length; i += 10) {
          const batch = ids.slice(i, i + 10);
          const s = await getDocs(query(collection(db, "courses"), where(documentId(), "in", batch)));
          s.forEach((docSnap) => rows.push({ id: docSnap.id, data: docSnap.data() as FirestoreCourse }));
        }

        // collect creator uids and fetch missing profiles
        const uids = new Set(rows.map((r) => r.data.creatorUid).filter(Boolean) as string[]);
        const missing = [...uids].filter((u) => !fetchedUidsRef.current.has(u));
        for (let i = 0; i < missing.length; i += 10) {
          const batch = missing.slice(i, i + 10);
          const s = await getDocs(query(collection(db, "users"), where(documentId(), "in", batch)));
          const updates: Record<string, UserDoc> = {};
          s.forEach((u) => {
            updates[u.id] = { displayName: u.data().displayName, photoURL: u.data().photoURL };
            fetchedUidsRef.current.add(u.id);
          });
          if (Object.keys(updates).length) setProfiles((p) => ({ ...p, ...updates }));
        }

        // map to cards (mark purchased)
        rows.sort((a, b) => {
          const ta = a.data.createdAt?.toDate().getTime?.() ?? 0;
          const tb = b.data.createdAt?.toDate().getTime?.() ?? 0;
          return tb - ta;
        });

        setItems(
          rows.map(({ id, data }) => {
            const prof = data.creatorUid ? profiles[data.creatorUid] : undefined;
            return courseToCard(id, data, prof?.displayName ?? "Creator", prof?.photoURL, true);
          })
        );

        setLoading(false);
      },
      (err) => {
        console.error("Failed to load purchases:", err);
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid, profiles]);

  return (
    <Box>
      <CustomAppBar />
      <Box sx={{ px: 3, pt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Acquired courses</Typography>
        <CourseGrid
          items={items}
          loading={loading}
          emptyText="You haven’t acquired any courses yet."
          showSignInPrompt={!uid}
        />
      </Box>
    </Box>
  );
}
