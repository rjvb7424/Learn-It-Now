// External imports
import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";

// Internal imports
import CourseCard from "./CourseCard";
import { db } from "../firebase/firebase";

type FirestoreCourse = {
  title?: string;
  description?: string;
  price?: number;
  isFree?: boolean;
  creatorUid?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  // lessons?: { title: string; content: string }[]; // not needed for the grid
};

type CourseListItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  creatorUid?: string;
  createdAt?: Date | null;
};

function formatDate(d?: Date | null) {
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CourseGrid() {
  const [items, setItems] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If your collection is named "Courses" (capital C), change it here.
    const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: CourseListItem[] = snap.docs.map((doc) => {
          const data = doc.data() as FirestoreCourse;
          return {
            id: doc.id,
            title: data.title ?? "Untitled course",
            description:
              data.description ??
              "No description provided.",
            price: typeof data.price === "number" ? data.price : 0,
            isFree: Boolean(data.isFree ?? (typeof data.price === "number" ? data.price === 0 : true)),
            creatorUid: data.creatorUid,
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
          };
        });
        setItems(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load courses:", err);
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

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
        {items.map((c) => (
          <CourseCard
            key={c.id}
            // Header info
            author={c.creatorUid ? `Creator ${c.creatorUid.slice(0, 6)}` : "Creator"}
            authorInitials="CR"
            date={formatDate(c.createdAt) || "—"}
            // Main
            title={c.title}
            description={c.description}
            price={c.isFree ? 0 : c.price}
            // Optional: you can wire this to your checkout/enroll flow
            onAcquire={({ title, price }) => {
              console.log("Acquire:", title, price);
              // e.g. navigate(`/checkout/${c.id}`)
            }}
          />
        ))}
      </Box>
    ),
    [items]
  );

  if (loading) {
    return (
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="body2">Loading courses…</Typography>
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="body2">No courses yet.</Typography>
      </Box>
    );
  }

  return grid;
}
