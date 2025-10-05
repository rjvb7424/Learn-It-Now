// src/components/PricingPublishSection.tsx
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

const MIN_PRICE_EUR = 2; // 👈 hard-coded minimum

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
    const fixed = Math.floor(num * 10) / 10; // keep 1 decimal place like before
    setPrice(fixed.toString());
  };

  const priceNum = parseFloat(price || "0");
  const tooLow = !isFree && priceNum < MIN_PRICE_EUR;

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
              label="Price in EUR (Required)"
              fullWidth
              value={price}
              onChange={onPriceChange}
              onBlur={() => {
                // optional: bump up to the minimum on blur
                if (priceNum > 0 && priceNum < MIN_PRICE_EUR) {
                  setPrice(MIN_PRICE_EUR.toFixed(1)); // keep your 1-decimal style
                }
              }}
              type="number"
              inputProps={{ min: MIN_PRICE_EUR, max: LIMITS.maxPrice, step: 0.1 }}
              helperText={
                tooLow
                  ? `Minimum price is €${MIN_PRICE_EUR.toFixed(2)}.`
                  : `Enter a price between €${MIN_PRICE_EUR.toFixed(2)} and €${LIMITS.maxPrice}.`
              }
              error={tooLow}
            />
          )}

          <Divider />

          {errorList.length > 0 && (
            <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
              {errorList[0]}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              size="large"
              onClick={onPublish}
              disabled={!canPublish || tooLow}
            >
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
