// src/pages/MyCoursesPage.tsx
import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  documentId,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CustomAppBar from "./components/customappbar/CustomAppBar";
import CourseGrid from "./components/CourseGrid";
import { db, auth } from "./firebase/firebase";
import { courseToCard } from "./components/courseMapping";
import type { FirestoreCourse, UserDoc } from "./components/courseMapping";
import PageHeader from "./components/PageHeader";

export default function MyCoursesPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<ReturnType<typeof courseToCard>[]>([]);
  const [loading, setLoading] = useState(true);

  // cache creator profiles (uid -> {displayName, photoURL})
  const profilesRef = useRef<Record<string, UserDoc>>({});
  const fetchedUidsRef = useRef<Set<string>>(new Set());

  // auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // authored courses (only when uid changes)
  useEffect(() => {
    if (!authReady) return;

    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Only courses where creatorUid === current user
    // (no orderBy to avoid composite index; we’ll sort client-side)
    const q = query(collection(db, "courses"), where("creatorUid", "==", uid));

    const unsub = onSnapshot(
      q,
      async (snap) => {
        // collect docs
        const rows: { id: string; data: FirestoreCourse }[] = [];
        snap.forEach((d) => rows.push({ id: d.id, data: d.data() as FirestoreCourse }));

        if (rows.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // fetch missing creator profiles (usually just yourself)
        const uids = Array.from(
          new Set(rows.map((r) => r.data.creatorUid).filter(Boolean) as string[])
        );
        const missing = uids.filter((u) => !fetchedUidsRef.current.has(u));

        // local merged map to avoid re-render loops
        const mergedProfiles: Record<string, UserDoc> = { ...profilesRef.current };

        for (let i = 0; i < missing.length; i += 10) {
          const batch = missing.slice(i, i + 10);
          const s = await getDocs(
            query(collection(db, "users"), where(documentId(), "in", batch))
          );
          s.forEach((u) => {
            const d = u.data() as UserDoc;
            mergedProfiles[u.id] = { displayName: d.displayName, photoURL: d.photoURL };
            fetchedUidsRef.current.add(u.id);
          });
        }
        profilesRef.current = mergedProfiles;

        // sort by createdAt desc (client-side)
        rows.sort((a, b) => {
          const ta = a.data.createdAt?.toDate?.().getTime?.() ?? 0;
          const tb = b.data.createdAt?.toDate?.().getTime?.() ?? 0;
          return tb - ta;
        });

        // map to cards
        const nextItems = rows.map(({ id, data }) => {
          const prof = data.creatorUid ? mergedProfiles[data.creatorUid] : undefined;
          return courseToCard(
            id,
            data,
            prof?.displayName ?? "Creator",
            prof?.photoURL
          );
        });

        setItems(nextItems);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load authored courses:", err);
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid, authReady]);

  return (
    <Box>
      <CustomAppBar showSearch={false} />
      <PageHeader title="Created Courses Page" subtitle="A list of all the Courses you’ve created!" />
      <CourseGrid
        items={items}
        loading={loading}
        emptyText="You haven’t created any courses yet."
        showSignInPrompt={authReady && !uid}
      />
    </Box>
  );
}
