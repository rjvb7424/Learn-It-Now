import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  collection, onSnapshot, query, where, documentId, getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CustomAppBar from "./components/customappbar/CustomAppBar";
import CourseGrid from "./components/CourseGrid";
import { db, auth } from "./firebase/firebase";
import { courseToCard } from "./components/courseMapping";
import type { FirestoreCourse, UserDoc } from "./components/courseMapping";
import PageHeader from "./components/PageHeader";

export default function AcquiredCoursesPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);        // 👈 wait for auth result
  const [items, setItems] = useState<ReturnType<typeof courseToCard>[]>([]);
  const [loading, setLoading] = useState(true);

  // creator profile cache
  const profilesRef = useRef<Record<string, UserDoc>>({});
  const fetchedUidsRef = useRef<Set<string>>(new Set());

  // auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // purchases listener (runs only when uid changes)
  useEffect(() => {
    // If we don't know auth yet, keep loading to avoid “no items” flash
    if (!authReady) return;

    // No user → show sign-in prompt (CourseGrid handles it), no flicker
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const purchasesRef = collection(db, "users", uid, "purchases");
    const unsub = onSnapshot(
      purchasesRef,
      async (snap) => {
        const ids = snap.docs.map((d) => d.id);

        if (ids.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // 1) fetch courses by id in batches of 10
        const rows: { id: string; data: FirestoreCourse }[] = [];
        for (let i = 0; i < ids.length; i += 10) {
          const batch = ids.slice(i, i + 10);
          const s = await getDocs(
            query(collection(db, "courses"), where(documentId(), "in", batch))
          );
          s.forEach((docSnap) =>
            rows.push({ id: docSnap.id, data: docSnap.data() as FirestoreCourse })
          );
        }

        // 2) fetch any missing creator profiles (no dependency re-run)
        const uids = Array.from(
          new Set(rows.map((r) => r.data.creatorUid).filter(Boolean) as string[])
        );
        const missing = uids.filter((u) => !fetchedUidsRef.current.has(u));

        // build a local merged profiles map without triggering the effect again
        const mergedProfiles: Record<string, UserDoc> = { ...profilesRef.current };

        for (let i = 0; i < missing.length; i += 10) {
          const batch = missing.slice(i, i + 10);
          const s = await getDocs(
            query(collection(db, "users"), where(documentId(), "in", batch))
          );
          s.forEach((u) => {
            const data = u.data() as UserDoc;
            mergedProfiles[u.id] = {
              displayName: data.displayName,
              photoURL: data.photoURL,
            };
            fetchedUidsRef.current.add(u.id);
          });
        }
        // update the ref once after we fetched what we needed
        profilesRef.current = mergedProfiles;

        // 3) sort & map to cards with purchased=true
        rows.sort((a, b) => {
          const ta = a.data.createdAt?.toDate?.().getTime?.() ?? 0;
          const tb = b.data.createdAt?.toDate?.().getTime?.() ?? 0;
          return tb - ta;
        });

        const nextItems = rows.map(({ id, data }) => {
          const prof = data.creatorUid ? mergedProfiles[data.creatorUid] : undefined;
          return courseToCard(
            id,
            data,
            prof?.displayName ?? "Creator",
            prof?.photoURL,
            /* purchased */ true
          );
        });

        setItems(nextItems);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load purchases:", err);
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid, authReady]); // 👈 no `profiles` here

  return (
    <Box>
      <CustomAppBar showSearch={false} />
      <PageHeader title="Purchases Page" subtitle="A list of all the courses you have acquired!" />
      <CourseGrid
        items={items}
        loading={loading}
        emptyText="You haven’t acquired any courses yet."
        showSignInPrompt={authReady && !uid}
      />
    </Box>
  );
}
