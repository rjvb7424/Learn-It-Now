// src/createpage/CreatePage.tsx
import { useMemo, useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import CustomAppBar from "../components/CustomAppBar";
import DetailsSection from "./components/DetailsSection";
import ContentSection from "./components/ContentSection";
import PricingPublishSection from "./components/PricingPublishSection";
import type { Lesson } from "./Types";
import { LIMITS } from "./Types";
import type { Errors } from "./Types";

// 👇 Firestore + Auth
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

export default function CreatePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("0");
  const [publishing, setPublishing] = useState(false);

  const addLesson = () => setLessons(ls => [...ls, { title: "", content: "" }]);

  const updateLesson = (index: number, field: "title" | "content", value: string) => {
    setLessons(ls => ls.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const removeLesson = (index: number) => {
    setLessons(ls => ls.filter((_, i) => i !== index));
  };

  const errors: Errors = useMemo(() => {
    const errs: Errors = {};
    if (!title.trim()) errs.title = "Title is required.";
    if (!description.trim()) errs.description = "Description is required.";
    if (lessons.length === 0) errs.lessons = "Add at least one lesson.";
    if (lessons.some((l) => !l.title.trim() || !l.content.trim())) errs.lessonFields = "Fill all lesson fields.";
    if (!isFree) {
      if (price === "" || Number(price) < 0.01) errs.price = `Enter a valid price between 0 and ${LIMITS.maxPrice}€`;
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

  // 👇 Save to Firestore
  const onPublish = async () => {
    if (!canPublish || publishing) return;

    const user = auth.currentUser;
    if (!user) {
      // In theory this route should be protected already, but just in case:
      alert("Please sign in to publish a course.");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      lessons: lessons.map((l) => ({
        title: l.title.trim(),
        content: l.content.trim(),
      })),
      isFree,
      price: isFree ? 0 : Number(price),
      creatorUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      setPublishing(true);
      const docRef = await addDoc(collection(db, "courses"), payload);
      console.log("Course published with ID:", docRef.id);
      alert("Course published!");
      // Optionally reset form after publish:
      onReset();
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
      <CustomAppBar />
      <Container>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Create Course
        </Typography>

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
        />
      </Container>
    </Box>
  );
}
