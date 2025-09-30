import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ChangeEvent } from "react";
import { LIMITS } from "../Types";

type Props = {
  isFree: boolean;
  price: string;
  setIsFree: (b: boolean) => void;
  setPrice: (v: string) => void;
  errorList: string[];
  canPublish: boolean;
  onPublish: VoidFunction;
  onReset: VoidFunction;
};

export default function PricingPublishSection({
  isFree,
  price,
  setIsFree,
  setPrice,
  errorList,
  canPublish,
  onPublish,
  onReset,
}: Props) {
  const onPriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^\d.]/g, "");
    if (cleaned === "") return setPrice("0");

    let num = parseFloat(cleaned);
    if (!Number.isFinite(num) || num < 0) return setPrice("0");

    num = Math.min(num, LIMITS.maxPrice);
    const fixed = Math.floor(num * 10) / 10; // 1 decimal place
    setPrice(fixed.toString());
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Pricing & Publish
        </Typography>

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

          <Divider />

          {errorList.length > 0 && (
            <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
              {errorList[0]}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button variant="contained" size="large" onClick={onPublish} disabled={!canPublish}>
              Publish Course
            </Button>
            <Button variant="outlined" size="large" onClick={onReset}>
              Reset
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
