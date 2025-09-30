import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LessonItem from "./LessonItem";
import { LIMITS } from "../Types";
import type { Lesson } from "../Types";

type Props = {
  lessons: Lesson[];
  addLesson: VoidFunction;
  updateLesson: (id: string, field: "title" | "content", value: string) => void;
  removeLesson: (id: string) => void;
  showAddAtLeastOne?: boolean; // pass errors.lessons
};

export default function ContentSection({
  lessons,
  addLesson,
  updateLesson,
  removeLesson,
  showAddAtLeastOne,
}: Props) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">Course Content</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addLesson}
            disabled={lessons.length >= LIMITS.maxLessons}
          >
            Add Lesson ({lessons.length}/{LIMITS.maxLessons})
          </Button>
        </Stack>

        {showAddAtLeastOne && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Add at least one lesson (Required)
          </Typography>
        )}

        <Stack spacing={2}>
          {lessons.map((lesson, idx) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              index={idx}
              updateLesson={updateLesson}
              removeLesson={removeLesson}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
