// src/pages/AcquiredCoursesPage.tsx
import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { collection, onSnapshot, query, where, documentId, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CustomAppBar from "./components/customappbar/CustomAppBar";
import CourseGrid from "./components/CourseGrid";
import { db, auth } from "./firebase/firebase";
import { courseToCard } from "./components/courseMapping";
import type { FirestoreCourse, UserDoc } from "./components/courseMapping";
import PageHeader from "./components/PageHeader";

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

    // Subcollection with doc IDs = course IDs
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

        // Fetch those courses by ID in batches of 10
        const rows: { id: string; data: FirestoreCourse }[] = [];
        for (let i = 0; i < ids.length; i += 10) {
          const batch = ids.slice(i, i + 10);
          const s = await getDocs(query(collection(db, "courses"), where(documentId(), "in", batch)));
          s.forEach((docSnap) => rows.push({ id: docSnap.id, data: docSnap.data() as FirestoreCourse }));
        }

        // Fetch creator profiles for cards
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

        // Sort by createdAt desc and map to course cards (purchased=true)
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
      <PageHeader title="Purchases" subtitle="Courses you’ve acquired" />
      <CourseGrid
        items={items}
        loading={loading}
        emptyText="You haven’t acquired any courses yet."
        showSignInPrompt={!uid}
      />
    </Box>
  );
}
