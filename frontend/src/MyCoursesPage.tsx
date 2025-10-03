// src/pages/MyCoursesPage.tsx
import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { collection, onSnapshot, orderBy, query, where, documentId, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CustomAppBar from "./components/customappbar/CustomAppBar";
import CourseGrid from "./components/CourseGrid";
import { db, auth } from "./firebase/firebase";
import { courseToCard } from "./components/courseMapping";
import type { FirestoreCourse, UserDoc } from "./components/courseMapping";
import PageHeader from "./components/PageHeader";

export default function MyCoursesPage() {
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
    // Only courses where creatorUid === current user
    const q = query(collection(db, "courses"), where("creatorUid", "==", uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        setLoading(true);
        const uids = new Set<string>();
        const raw = snap.docs.map((d) => {
          const data = d.data() as FirestoreCourse;
          if (data.creatorUid) uids.add(data.creatorUid);
          return { id: d.id, data };
        });

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

        setItems(
          raw.map(({ id, data }) => {
            const prof = data.creatorUid ? profiles[data.creatorUid] : undefined;
            return courseToCard(id, data, prof?.displayName ?? "Creator", prof?.photoURL);
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load authored courses:", err);
        setItems([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid, profiles]);

  return (
    <Box>
      <CustomAppBar />
      <PageHeader title="Created Courses" subtitle="Courses you’ve authored" />
      <CourseGrid
        items={items}
        loading={loading}
        emptyText="You haven’t created any courses yet."
        showSignInPrompt={!uid}
      />
    </Box>
  );
}
