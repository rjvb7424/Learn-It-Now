// External imports
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Box, Button, Card, CardContent, Container, Divider, IconButton, Stack, TextField, Typography, } from "@mui/material";

// Icon imports
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import CustomAppBar from "../homepage/CustomAppBar";

type Lesson = {
  id: string;
  title: string;
  content: string;
};

type Limits = {
  title: number;
  description: number;
  lessonTitle: number;
  lessonContent: number;
  maxLessons: number;
  maxPrice: number;
};

const LIMITS: Limits = {
  title: 50,
  description: 200,
  lessonTitle: 50,
  lessonContent: 500,
  maxLessons: 5,
  maxPrice: 100,
};

type Errors = Partial<{
  title: string;
  description: string;
  lessons: string;
  lessonFields: string;
  price: string;
}>;

export default function CreatePage() {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [price, setPrice] = useState<string>("");

  // Function to add a new lesson
  const addLesson = (): void => {
    if (lessons.length >= 5) return;
    setLessons((ls) => [...ls, { id: crypto.randomUUID(), title: "", content: "" }]);
  };

  const updateLesson = (
    id: string,
    field: keyof Pick<Lesson, "title" | "content">,
    value: string
  ): void => {
    setLessons((ls) => ls.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const removeLesson = (id: string): void => {
    setLessons((ls) => ls.filter((l) => l.id !== id));
  };

  const onPriceChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const cleaned = e.target.value.replace(/[^\d.]/g, "");
    if (cleaned === "") return setPrice("");
    const num = Math.min(parseFloat(cleaned), LIMITS.maxPrice);
    setPrice(Number.isFinite(num) && num >= 0 ? String(num) : "");
  };

  const errors: Errors = useMemo(() => {
    const errs: Errors = {};
    if (!title.trim()) errs.title = "Title is required.";
    if (!description.trim()) errs.description = "Description is required.";
    if (lessons.length === 0) errs.lessons = "Add at least one lesson.";
    if (lessons.some((l) => !l.title.trim() || !l.content.trim()))
      errs.lessonFields = "Fill all lesson fields.";
    if (price === "" || Number(price) < 0) errs.price = "Enter a valid price.";
    return errs;
  }, [title, description, lessons, price]);

  const canPublish = Object.keys(errors).length === 0;

  const onPublish = (): void => {
    const payload = {
      title: title.trim(),
      description: description.trim(),
      lessons: lessons.map((l, idx) => ({
        order: idx + 1,
        title: l.title.trim(),
        content: l.content.trim(),
      })),
      price: Number(price),
      publishedAt: new Date().toISOString(),
    };
    console.log("Publishing course:", payload);
    alert("Course published (check console for payload).");
  };

  const limitedChange =
    (setter: (v: string) => void, limit: number) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const v = e.target.value;
      setter(v.length <= limit ? v : v.slice(0, limit));
    };

  return (
    <Box>
      {/* App Bar */}
      <CustomAppBar />
      <Container>
      {/* Page Title */}
      <Typography variant="h4" sx={{ mb: 2 }}>
        Create Course
      </Typography>
      {/* Course Details */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Details
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Title (Required)"
              fullWidth
              value={title}
              onChange={limitedChange(setTitle, LIMITS.title)}
              inputProps={{ maxLength: LIMITS.title }}
              helperText={`${title.length}/${LIMITS.title}`}
              error={Boolean(errors.title)}
            />
            <TextField
              label="Description (Required)"
              fullWidth
              multiline
              minRows={3}
              value={description}
              onChange={limitedChange(setDescription, LIMITS.description)}
              inputProps={{ maxLength: LIMITS.description }}
              helperText={`${description.length}/${LIMITS.description}`}
              error={Boolean(errors.description)}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Course Content */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="h6">
              Course Content
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={addLesson}
              disabled={lessons.length >= LIMITS.maxLessons}
            >
              Add Lesson ({lessons.length}/{LIMITS.maxLessons})
            </Button>
          </Stack>

          {errors.lessons && (
            <Typography color="error" sx={{ mb: 1 }}>
              {errors.lessons}
            </Typography>
          )}

          <Stack spacing={2}>
            {lessons.map((lesson, idx) => (
              <Card key={lesson.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle1">Lesson {idx + 1}</Typography>
                    <IconButton aria-label="remove lesson" onClick={() => removeLesson(lesson.id)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Stack>

                  <Stack spacing={2}>
                    <TextField
                      label="Lesson Title"
                      fullWidth
                      value={lesson.title}
                      onChange={(e) =>
                        updateLesson(
                          lesson.id,
                          "title",
                          e.target.value.length <= LIMITS.lessonTitle
                            ? e.target.value
                            : e.target.value.slice(0, LIMITS.lessonTitle)
                        )
                      }
                      inputProps={{ maxLength: LIMITS.lessonTitle }}
                      helperText={`${lesson.title.length}/${LIMITS.lessonTitle}`}
                      error={Boolean(errors.lessonFields)}
                    />
                    <TextField
                      label="Lesson Content"
                      fullWidth
                      multiline
                      minRows={3}
                      value={lesson.content}
                      onChange={(e) =>
                        updateLesson(
                          lesson.id,
                          "content",
                          e.target.value.length <= LIMITS.lessonContent
                            ? e.target.value
                            : e.target.value.slice(0, LIMITS.lessonContent)
                        )
                      }
                      inputProps={{ maxLength: LIMITS.lessonContent }}
                      helperText={`${lesson.content.length}/${LIMITS.lessonContent}`}
                      error={Boolean(errors.lessonFields)}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* PRICE + PUBLISH */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Pricing & Publish
          </Typography>

          <Stack spacing={2}>
            <TextField
              label={`Price (0–${LIMITS.maxPrice})`}
              fullWidth
              value={price}
              onChange={onPriceChange}
              type="number"
              inputProps={{ min: 0, max: LIMITS.maxPrice, step: 1 }}
              error={Boolean(errors.price)}
              helperText={
                errors.price
                  ? errors.price
                  : price !== ""
                  ? `Set the course price (max ${LIMITS.maxPrice}).`
                  : " "
              }
            />

            <Divider />

            {errors.lessonFields && (
              <Typography color="error" sx={{ mb: 1 }}>
                {errors.lessonFields}
              </Typography>
            )}

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button variant="contained" size="large" onClick={onPublish} disabled={!canPublish}>
                Publish Course
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => {
                  setTitle("");
                  setDescription("");
                  setLessons([]);
                  setPrice("");
                }}
              >
                Reset
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
    </Box>
  );
}
