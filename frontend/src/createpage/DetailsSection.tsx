import { Stack, TextField, Typography, Card, CardContent } from "@mui/material";
import type { ChangeEvent } from "react";
import { LIMITS } from "./Types";

type Props = {
  title: string;
  description: string;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
};

const limitedChange =
  (setter: (v: string) => void, limit: number) =>
  (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setter(v.length <= limit ? v : v.slice(0, limit));
  };

export default function DetailsSection({
  title,
  description,
  setTitle,
  setDescription,
}: Props) {
  return (
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
  );
}
