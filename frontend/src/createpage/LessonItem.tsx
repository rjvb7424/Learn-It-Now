import { Card, CardContent, IconButton, Stack, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { LIMITS } from "./Types";
import type { Lesson } from "./Types";

type Props = {
  lesson: Lesson;
  index: number;
  updateLesson: (id: string, field: "title" | "content", value: string) => void;
  removeLesson: (id: string) => void;
};

export default function LessonItem({ lesson, index, updateLesson, removeLesson }: Props) {
  return (
    <Card key={lesson.id} variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1">Lesson #{index + 1}</Typography>
          <IconButton aria-label="remove lesson" onClick={() => removeLesson(lesson.id)}>
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>

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
  );
}
