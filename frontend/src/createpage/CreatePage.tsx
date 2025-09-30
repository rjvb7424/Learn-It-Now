// External imports
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Alert, Box, Button, Card, CardContent, Container, Divider, IconButton, Stack, TextField, Typography, Checkbox, FormControlLabel } from "@mui/material";

// Icon imports
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import CustomAppBar from "../components/CustomAppBar";

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
  const [isFree, setIsFree] = useState<boolean>(true);
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
  const cleaned = e.target.value.replace(/[^\d.]/g, ""); // keep digits and dot only
  if (cleaned === "") return setPrice("0");

  let num = parseFloat(cleaned);
  if (!Number.isFinite(num) || num < 0) return setPrice("0");

  num = Math.min(num, LIMITS.maxPrice);

  // Limit to 1 decimal place
  const fixed = Math.floor(num * 10) / 10; 
  setPrice(fixed.toString());
};

const errors: Errors = useMemo(() => {
  const errs: Errors = {};
  if (!title.trim()) errs.title = "Title is required.";
  if (!description.trim()) errs.description = "Description is required.";
  if ( lessons.length === 0 ) errs.lessons = "Add at least one lesson.";
  if (lessons.some((l) => !l.title.trim() || !l.content.trim()))
    errs.lessonFields = "Fill all lesson fields.";
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

  const onPublish = (): void => {
    const payload = {
      title: title.trim(),
      description: description.trim(),
      lessons: lessons.map((l, idx) => ({
        order: idx + 1,
        title: l.title.trim(),
        content: l.content.trim(),
      })),
      price: isFree ? 0 : Number(price),
      isFree,
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
          {/* Help Text For Lessons */}
          {errors.lessons && (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Add at least one lesson (Required)
            </Typography>
          )}
          {/* Lesson Header */}
          <Stack spacing={2}>
            {lessons.map((lesson, idx) => (
              <Card key={lesson.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle1">Lesson #{idx + 1}</Typography>
                    <IconButton aria-label="remove lesson" onClick={() => removeLesson(lesson.id)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Stack>
                  {/* Lesson Fields */}
                  <Stack spacing={2}>
                    <TextField
                      label="Lesson Title (Required)"
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
                    />
                    <TextField
                      label="Lesson Content (Required)"
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
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </CardContent>
      </Card>
      {/* Price and Publish Header */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Pricing & Publish
          </Typography>
          {/* Price Section */}
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isFree}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsFree(checked);
                    setPrice("0");
                  }}
                />
              }
              label="Course is free"
            />
            {!isFree && (
              <TextField
                label={`Price in EUR (Required)`}
                fullWidth
                value={price}
                onChange={onPriceChange}
                type="number"
                inputProps={{ min: 0, max: LIMITS.maxPrice, step: 0.1 }}
                helperText={`Enter a valid price between 0 and ${LIMITS.maxPrice}€`}
              />
            )}
            {/* Help Text For Publish */}
            <Divider />
            {errorList.length > 0 && (
              <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
                {errorList[0]}
              </Alert>
            )}
            {/* Publish and Reset Buttons */}
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
                  setIsFree(true);
                  setPrice("0");
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
