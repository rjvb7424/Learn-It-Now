// external imports
import { useEffect, useRef, useState, useMemo } from "react";
import { Box } from "@mui/material";
import { collection, onSnapshot, orderBy, query, where, documentId, getDocs, } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation } from "react-router-dom";

// internal imports
import CustomAppBar from "../components/customappbar/CustomAppBar";
import CourseGrid from "../components/CourseGrid";
import { db, auth } from "../firebase/firebase";
import { courseToCard } from "../components/courseMapping";
import type { FirestoreCourse, UserDoc } from "../components/courseMapping";
import PageHeader from "../components/PageHeader";
import { useCourseCheckout } from "../hooks/useCourseCheckout";
import LoadingOverlay from "../LoadingOverlay";

type Lesson = { title: string; content: string };
type Duration = { lessons: number; words: number; minutes: number };

const countWords = (t: string) =>
  t?.trim().match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9’']+/g)?.length ?? 0;

// compute a course's duration from its lessons
const computeDuration = (lessons: Lesson[]): Duration => {
  const WORDS_PER_MINUTE = 200;
  const words = lessons.reduce((s, l) => s + countWords(l.title) + countWords(l.content), 0);
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return { lessons: lessons.length, words, minutes };
};

// Home Page component that displays all available courses with search functionality.
export default function HomePage() {
  const [allItems, setAllItems] = useState<ReturnType<typeof courseToCard>[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Record<string, UserDoc>>({});
  const fetchedUidsRef = useRef<Set<string>>(new Set());
  const [uid, setUid] = useState<string | null>(null);

  const location = useLocation();
  const { startCheckout } = useCourseCheckout(uid);

  // current query from URL (?q=...)
  const q = useMemo(() => {
    const search = new URLSearchParams(location.search).get("q") || "";
    return search.trim().toLowerCase();
  }, [location.search]);

  // auth + purchases subscription
  useEffect(() => {
    let unsubPurchases: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      unsubPurchases?.();
      if (!u) {
        setPurchasedIds(new Set());
        return;
      }
      const ref = collection(db, "users", u.uid, "purchases");
      unsubPurchases = onSnapshot(ref, (snap) => {
        const ids = new Set<string>();
        snap.forEach((d) => ids.add(d.id));
        setPurchasedIds(ids);
      });
    });
    return () => {
      unsubAuth();
      unsubPurchases?.();
    };
  }, []);

  // Load all courses + creator profiles (+ stats)
  useEffect(() => {
    const qCourses = query(collection(db, "courses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qCourses,
      async (snap) => {
        setLoading(true);

        const uids = new Set<string>();
        const raw = snap.docs.map((d) => {
          const data = d.data() as FirestoreCourse & { lessons?: Lesson[]; stats?: Duration };
          if (data.creatorUid) uids.add(data.creatorUid);
          return { id: d.id, data };
        });

        // fetch missing profiles in small batches
        const missing = [...uids].filter((u) => !fetchedUidsRef.current.has(u));
        for (let i = 0; i < missing.length; i += 10) {
          const batch = missing.slice(i, i + 10);
          const s = await getDocs(query(collection(db, "users"), where(documentId(), "in", batch)));
          const updates: Record<string, UserDoc> = {};
          s.forEach((u) => {
            updates[u.id] = {
              displayName: u.data().displayName,
              photoURL: u.data().photoURL,
            };
            fetchedUidsRef.current.add(u.id);
          });
          if (Object.keys(updates).length) {
            setProfiles((p) => ({ ...p, ...updates }));
          }
        }

        // build cards with stats precomputed
        const cards = raw.map(({ id, data }) => {
          const prof = data.creatorUid ? profiles[data.creatorUid] : undefined;
          const name = prof?.displayName ?? "Creator";
          const avatar = prof?.photoURL;

          const lessonsArr = Array.isArray(data.lessons) ? data.lessons : [];
          const duration: Duration | undefined =
            data.stats ?? (lessonsArr.length ? computeDuration(lessonsArr) : undefined);

          return {
            ...courseToCard(id, data, name, avatar, purchasedIds.has(id)),
            duration, // will flow to <CourseCard duration={...} />
          };
        });

        setAllItems(cards);
        setLoading(false); // hide loader only when cards+profiles+stats are ready
      },
      (err) => {
        console.error("Failed to load courses:", err);
        setAllItems([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [profiles, purchasedIds]);

  // Filtered items derived from URL query
  const items = useMemo(() => {
    if (!q) return allItems;
    const queryStr = q.toLowerCase();
    return allItems.filter((card) => {
      const haystack = `${card.title} ${card.description} ${card.author}`.toLowerCase();
      return haystack.includes(queryStr);
    });
  }, [allItems, q]);

  return (
    <Box>
      <Box sx={{ position: "relative" }}>
        <CustomAppBar />
        <Box sx={{ position: "absolute", top: 11, left: "50%", transform: "translateX(-50%)", zIndex: (t) => t.zIndex.appBar + 1 }} />
      </Box>

      <PageHeader
        title={q ? `Results for “${new URLSearchParams(location.search).get("q")?.trim()}”` : "Home Page"}
        subtitle={q ? "A list of courses matching your search." : "Browse all available courses in our platform!"}
      />

      {!loading && (
        <CourseGrid
          items={items}
          loading={false}
          emptyText={q ? "No courses match your search." : "No courses yet."}
          onAcquire={({ courseId }) => startCheckout(courseId)}
        />
      )}

      <LoadingOverlay open={loading} />
    </Box>
  );
}
