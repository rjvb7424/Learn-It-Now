// src/pages/HomePage.tsx
import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  documentId,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CustomAppBar from "../components/customappbar/CustomAppBar";
import SearchOverlay from "./SearchBar";
import CourseGrid from "../components/CourseGrid";
import { db, auth } from "../firebase/firebase";
import { courseToCard } from "../components/courseMapping";
import type { FirestoreCourse, UserDoc } from "../components/courseMapping";
import PageHeader from "../components/PageHeader";

export default function HomePage() {
  const [items, setItems] = useState<ReturnType<typeof courseToCard>[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Record<string, UserDoc>>({});
  const fetchedUidsRef = useRef<Set<string>>(new Set());

  // purchases for current user (badge on cards)
  useEffect(() => {
    let unsubPurchases: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      unsubPurchases?.();
      if (!u) {
        setPurchased(new Set());
        return;
      }
      const ref = collection(db, "users", u.uid, "purchases");
      unsubPurchases = onSnapshot(ref, (snap) => {
        const s = new Set<string>();
        snap.forEach((d) => s.add(d.id));
        setPurchased(s);
      });
    });
    return () => {
      unsubAuth();
      unsubPurchases?.();
    };
  }, []);

  // all courses
  useEffect(() => {
    const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        setLoading(true);
        const creatorUids = new Set<string>();
        const raw = snap.docs.map((d) => {
          const data = d.data() as FirestoreCourse;
          if (data.creatorUid) creatorUids.add(data.creatorUid);
          return { id: d.id, data };
        });

        // fetch any missing profiles (batch by 10)
        const missing = [...creatorUids].filter((u) => !fetchedUidsRef.current.has(u));
        for (let i = 0; i < missing.length; i += 10) {
          const batch = missing.slice(i, i + 10);
          const s = await getDocs(query(collection(db, "users"), where(documentId(), "in", batch)));
          const updates: Record<string, UserDoc> = {};
          s.forEach((u) => {
            updates[u.id] = { displayName: u.data().displayName, photoURL: u.data().photoURL };
            fetchedUidsRef.current.add(u.id);
          });
          if (Object.keys(updates).length) {
            setProfiles((prev) => ({ ...prev, ...updates }));
          }
        }

        // map to card data
        setItems(
          raw.map(({ id, data }) => {
            const prof = data.creatorUid ? profiles[data.creatorUid] : undefined;
            const name = prof?.displayName ?? "Creator";
            const avatar = prof?.photoURL;
            return courseToCard(id, data, name, avatar, purchased.has(id));
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load courses:", err);
        setItems([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [profiles, purchased]);

  return (
    <Box>
      <Box sx={{ position: "relative" }}>
        <CustomAppBar />
        <Box
          sx={{
            position: "absolute",
            top: 11,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: (t) => t.zIndex.appBar + 1,
          }}
        >
          <SearchOverlay onSearch={(q) => q && console.log("search:", q)} />
        </Box>
      </Box>
      
      <PageHeader title="Home Page" subtitle="Browse all available courses" />

      <CourseGrid items={items} loading={loading} />
    </Box>
  );
}
