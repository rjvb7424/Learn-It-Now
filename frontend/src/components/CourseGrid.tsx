// src/components/CourseGrid.tsx
import { useEffect, useRef, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import {
  collection, onSnapshot, orderBy, query, Timestamp, getDocs, where, documentId, doc, getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import CourseCard from "../homepage/CourseCard";
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

type CourseGridProps = {
  /** "all" = every course; "authored" = creatorUid === current user; "purchased" = user's acquired */
  source: "all" | "authored" | "purchased";
  /** Optional: override which user we filter by (defaults to current user for authored/purchased). */
  uidOverride?: string;
  /** Optional custom empty-state text */
  emptyText?: string;
};

function getInitials(name?: string) {
  if (!name) return "CR";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "CR";
}

export default function CourseGrid({ source, uidOverride, emptyText }: CourseGridProps) {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserDoc>>({});
  const [loading, setLoading] = useState(true);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const fetchedUidsRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  // Track current user (needed for authored/purchased when uidOverride not provided)
  useEffect(() => {
    if (uidOverride) {
      setCurrentUid(uidOverride);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUid(u?.uid ?? null);
    });
    return () => unsub();
  }, [uidOverride]);

  // Load courses based on source
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    async function loadPurchasedCourses(uid: string) {
      setLoading(true);
      try {
        // Read the list of purchase IDs
        const purchasesRef = collection(db, "users", uid, "purchases");
        // Subscribe to purchases, then batch-fetch course docs
        unsub = onSnapshot(
          purchasesRef,
          async (snap) => {
            const ids = snap.docs.map((d) => d.id);
            setPurchasedIds(new Set(ids));

            if (ids.length === 0) {
              if (!cancelled) {
                setCourses([]);
                setLoading(false);
              }
              return;
            }

            // Batch by 10 for where(documentId(), "in", ...)
            const rows: CourseRow[] = [];
            for (let i = 0; i < ids.length; i += 10) {
              const batchIds = ids.slice(i, i + 10);
              const q = query(collection(db, "courses"), where(documentId(), "in", batchIds));
              const res = await getDocs(q);
              res.forEach((docSnap) => {
                const d = docSnap.data() as FirestoreCourse;
                rows.push({
                  id: docSnap.id,
                  title: d.title ?? "Untitled course",
                  description: d.description ?? "No description provided.",
                  price: typeof d.price === "number" ? d.price : 0,
                  isFree: d.isFree ?? (typeof d.price === "number" ? d.price === 0 : true),
                  creatorUid: d.creatorUid,
                  createdAt: d.createdAt ? d.createdAt.toDate() : null,
                });
              });
            }

            // Sort newest first (because batch fetch doesn't guarantee order)
            rows.sort((a, b) => {
              const ta = a.createdAt?.getTime() ?? 0;
              const tb = b.createdAt?.getTime() ?? 0;
              return tb - ta;
            });

            if (!cancelled) {
              setCourses(rows);
              setLoading(false);
            }
          },
          (err) => {
            console.error("Failed to load purchases:", err);
            if (!cancelled) {
              setPurchasedIds(new Set());
              setCourses([]);
              setLoading(false);
            }
          }
        );
      } catch (e) {
        console.error("Failed to load purchased courses:", e);
        if (!cancelled) {
          setCourses([]);
          setLoading(false);
        }
      }

      return () => unsub?.();
    }

    async function loadAuthoredCourses(uid: string) {
      // You may need a composite index: courses by creatorUid + createdAt desc
      const q = query(
        collection(db, "courses"),
        where("creatorUid", "==", uid),
        orderBy("createdAt", "desc")
      );
      setLoading(true);
      unsub = onSnapshot(
        q,
        (snap) => {
          const rows: CourseRow[] = snap.docs.map((docSnap) => {
            const d = docSnap.data() as FirestoreCourse;
            return {
              id: docSnap.id,
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
          console.error("Failed to load authored courses:", err);
          setCourses([]);
          setLoading(false);
        }
      );
      return () => unsub?.();
    }

    function loadAllCourses() {
      const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
      setLoading(true);
      unsub = onSnapshot(
        q,
        (snap) => {
          const rows: CourseRow[] = snap.docs.map((docSnap) => {
            const d = docSnap.data() as FirestoreCourse;
            return {
              id: docSnap.id,
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
      return () => unsub?.();
    }

    // Decide which loader to run
    if (source === "all") {
      const cleanup = loadAllCourses();
      return () => cleanup?.();
    }

    // "authored" or "purchased" require a uid
    const uid = uidOverride ?? currentUid;
    if (!uid) {
      // not signed in
      setCourses([]);
      setLoading(false);
      return;
    }

    if (source === "authored") {
      const cleanup = loadAuthoredCourses(uid);
      return () => cleanup?.();
    }

    if (source === "purchased") {
      const cleanup = loadPurchasedCourses(uid);
      return () => cleanup?.();
    }

    return () => {
      unsub?.();
      cancelled = true;
    };
  }, [source, uidOverride, currentUid]);

  // Fetch creator profiles when courses change
  useEffect(() => {
    let cancelled = false;
    const fetched = fetchedUidsRef.current;

    const allUids = Array.from(new Set(courses.map((c) => c.creatorUid).filter(Boolean) as string[]));
    const missing = allUids.filter((uid) => !fetched.has(uid));
    if (missing.length === 0) return;

    (async () => {
      for (let i = 0; i < missing.length; i += 10) {
        const batch = missing.slice(i, i + 10);
        try {
          const snap = await getDocs(query(collection(db, "users"), where(documentId(), "in", batch)));
          const updates: Record<string, UserDoc> = {};
          snap.forEach((docSnap) => {
            const d = docSnap.data() as UserDoc;
            updates[docSnap.id] = {
              displayName: d.displayName ?? "Creator",
              photoURL: d.photoURL ?? undefined,
            };
            fetched.add(docSnap.id);
          });
          if (!cancelled && Object.keys(updates).length) {
            setProfiles((prev) => ({ ...prev, ...updates }));
          }
        } catch (e) {
          console.error("Failed to load user profiles batch:", e);
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    })();

    return () => { cancelled = true; };
  }, [courses]);

  const showSignInPrompt =
    (source === "authored" || source === "purchased") && !(uidOverride || currentUid);

  if (loading) {
    return (
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="body2">Loading courses…</Typography>
      </Box>
    );
  }

  if (showSignInPrompt) {
    return (
      <Box sx={{ px: 3, py: 6, textAlign: "center" }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Please sign in to view this list.
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/signin")}>Sign in</Button>
      </Box>
    );
  }

  if (courses.length === 0) {
    return (
      <Box sx={{ px: 3, py: 6, textAlign: "center" }}>
        <Typography variant="body2">
          {emptyText ??
            (source === "authored"
              ? "You haven’t created any courses yet."
              : source === "purchased"
              ? "You haven’t acquired any courses yet."
              : "No courses yet.")}
        </Typography>
      </Box>
    );
  }

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
            purchased={purchasedIds.has(c.id)}
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
