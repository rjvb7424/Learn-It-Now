// src/createpage/CreatePage.tsx
import { useMemo, useState } from "react";
import { Box, Container } from "@mui/material";
import CustomAppBar from "../components/customappbar/CustomAppBar";
import DetailsSection from "./components/DetailsSection";
import ContentSection from "./components/ContentSection";
import PricingPublishSection from "./components/PricingPublishSection";
import type { Lesson } from "./Types";
import { LIMITS } from "./Types";
import type { Errors } from "./Types";
import PolicyNotice from "./components/PolicyNotice";

import { collection, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import PageHeader from "../components/PageHeader";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "../LoadingOverlay"; // ⬅️ use reusable loader

// NEW imports
import { useAuthProfile } from "../hooks/useAuthProfile";
import { useStripeOnboarding } from "../hooks/useStripeOnboarding";
import StripeSetupDialog from "../components/customappbar/components/StripeSetupDialog";

export default function CreatePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("0");
  const [publishing, setPublishing] = useState(false);

  // NEW: Stripe dialog state
  const [stripeDlgOpen, setStripeDlgOpen] = useState(false);

  const navigate = useNavigate();

  // NEW: auth profile / Stripe info
  const { firebaseUser, stripeAccountId, stripeOnboarded, canPublishPaid } = useAuthProfile();

  // NEW: Stripe onboarding hooks
  const {
    busy: stripeBusy,
    error: stripeError,
    setError: setStripeError,
    createAccountAndGo,
    continueOnboarding,
  } = useStripeOnboarding({ uid: firebaseUser?.uid });

  const addLesson = () => setLessons((ls) => [...ls, { title: "", content: "" }]);

  const updateLesson = (index: number, field: "title" | "content", value: string) => {
    setLessons((ls) => ls.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const removeLesson = (index: number) => {
    setLessons((ls) => ls.filter((_, i) => i !== index));
  };

  const errors: Errors = useMemo(() => {
    const errs: Errors = {};
    if (!title.trim()) errs.title = "Title is required.";
    if (!description.trim()) errs.description = "Description is required.";
    if (lessons.length === 0) errs.lessons = "Add at least one lesson.";
    if (lessons.some((l) => !l.title.trim() || !l.content.trim()))
      errs.lessonFields = "Fill all lesson fields.";
    if (!isFree) {
      if (price === "" || Number(price) < 0.01)
        errs.price = `Enter a valid price between 1.00 and ${LIMITS.maxPrice}€`;
    }
    return errs;
  }, [title, description, lessons, price, isFree]);

  const canPublish = Object.keys(errors).length === 0;

  const errorList = useMemo(() => {
    const msgs: string[] = [];
    if (errors.title) msgs.push(errors.title);
    if (errors.description) msgs.push(errors.description);
    if (errors.lessons) msgs.push(errors.lessons);
    if (errors.lessonFields) msgs.push(errors.lessonFields);
    if (errors.price) msgs.push(errors.price);
    return msgs;
  }, [errors]);

  const onPublish = async () => {
    if (!canPublish || publishing) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in to publish a course.");
      return;
    }

    // 🔐 NEW: Require Stripe only for paid courses
    if (!isFree && !canPublishPaid) {
      setStripeDlgOpen(true);
      return;
    }

    const trimmedLessons = lessons.map((l) => ({
      title: l.title.trim(),
      content: l.content.trim(),
    }));

    const payload = {
      title: title.trim(),
      description: description.trim(),
      lessons: trimmedLessons,
      isFree,
      price: isFree ? 0 : Number(price),
      creatorUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      setPublishing(true);

      // 1) Create the course
      const courseRef = await addDoc(collection(db, "courses"), payload);

      // 2) Immediately add it to the creator's purchases so they can view it
      await setDoc(
        doc(db, "users", user.uid, "purchases", courseRef.id),
        {
          acquiredAt: serverTimestamp(),
          currentLessonIndex: 0, // start at first lesson
        },
        { merge: true }
      );

      // 3) Reset and navigate
      onReset();
      navigate("/", { replace: true });
      // or: navigate(`/course/${courseRef.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to publish course. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const onReset = () => {
    setTitle("");
    setDescription("");
    setLessons([]);
    setIsFree(true);
    setPrice("0");
  };

  return (
    <Box>
      <CustomAppBar showSearch={false} />
      <Container>
        <PageHeader
          title="Create a New Course Page"
          subtitle="Fill in the details below to create your very own course!"
        />

        <PolicyNotice />

        <DetailsSection
          title={title}
          description={description}
          setTitle={setTitle}
          setDescription={setDescription}
        />

        <ContentSection
          lessons={lessons}
          addLesson={addLesson}
          updateLesson={updateLesson}
          removeLesson={removeLesson}
          showAddAtLeastOne={Boolean(errors.lessons)}
        />

        <PricingPublishSection
          isFree={isFree}
          price={price}
          setIsFree={setIsFree}
          setPrice={setPrice}
          errorList={errorList}
          canPublish={canPublish && !publishing}
          onPublish={onPublish}
          onReset={onReset}
          canPublishPaid={canPublishPaid}
          onRequireStripe={() => setStripeDlgOpen(true)}
        />

      </Container>

      {/* NEW: Stripe setup dialog for paid publishing */}
      <StripeSetupDialog
        open={stripeDlgOpen}
        loading={stripeBusy}
        error={stripeError}
        stripeAccountId={stripeAccountId}
        stripeOnboarded={stripeOnboarded}
        onClose={() => setStripeDlgOpen(false)}
        onCreateAccount={createAccountAndGo}
        onContinueOnboarding={() => continueOnboarding(stripeAccountId)}
        clearError={() => setStripeError(null)}
      />

      {/* Full-screen loading while publishing */}
      <LoadingOverlay open={publishing} />
    </Box>
  );
}
