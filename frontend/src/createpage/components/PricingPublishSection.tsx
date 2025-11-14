// src/createpage/components/PricingPublishSection.tsx
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
import { useEffect } from "react";
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

  // NEW: can this user publish paid courses?
  canPublishPaid: boolean;

  // NEW: called when user tries to make the course paid but isn’t onboarded
  onRequireStripe: () => void;
};

const MIN_PRICE_EUR = 1;
const PLATFORM_FEE_RATE = 0.3;

const toNumberSafe = (v: string) => {
  const n = parseFloat(v || "0");
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function PricingPublishSection({
  isFree,
  price,
  setIsFree,
  setPrice,
  errorList,
  canPublish,
  onPublish,
  onReset,
  canPublishPaid,
  onRequireStripe,
}: Props) {
  // Ensure defaults:
  // - Free courses keep price at 0.00
  // - When switching to paid, prefill to €1.00 if below the minimum
  useEffect(() => {
    if (isFree) {
      if (price !== "0.00") setPrice("0.00");
    } else {
      const n = toNumberSafe(price);
      if (n < MIN_PRICE_EUR) setPrice(MIN_PRICE_EUR.toFixed(2));
      else setPrice(n.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFree]);

  const normalizePriceInput = (raw: string) => {
    // Allow digits, one decimal (comma or dot), max 2 decimals
    const withDot = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
    const [intPart = "0", decPartRaw = ""] = withDot.split(".");
    const decPart = decPartRaw.slice(0, 2);
    return decPartRaw === "" && withDot.includes(".")
      ? `${intPart}.` // allow typing the dot and then decimals
      : decPartRaw !== undefined
      ? `${intPart}${decPart ? "." + decPart : ""}`
      : intPart;
  };

  const onPriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPrice(normalizePriceInput(e.target.value));
  };

  const priceNumRaw = toNumberSafe(price);
  const priceNum = isFree ? 0 : priceNumRaw;
  const tooLow = !isFree && priceNum < MIN_PRICE_EUR;

  const fee = isFree ? 0 : round2(priceNum * PLATFORM_FEE_RATE);
  const total = isFree ? 0 : round2(priceNum + fee);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Pricing &amp; Publish
        </Typography>

        {!isFree && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Buyers pay the course price plus a <b>30% platform fee</b>.{" "}
            <b>A separate payment processing fee will also be deducted from the
            creator’s payout</b> (card/network fees taken by Stripe).{" "}
            Estimated buyer total: €{total.toFixed(2)} (course €
            {priceNum.toFixed(2)} + platform fee €{fee.toFixed(2)}).
          </Typography>
        )}

        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isFree}
                onChange={(e) => {
                  const checked = e.target.checked; // true => free, false => paid

                  // User is trying to make the course PAID
                  if (!checked && !canPublishPaid) {
                    // Open Stripe dialog and DO NOT toggle yet
                    onRequireStripe();
                    return;
                  }

                  // Allowed toggle (either to free, or to paid with Stripe ready)
                  setIsFree(checked);
                  setPrice(checked ? "0.00" : MIN_PRICE_EUR.toFixed(2));
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
                let num = toNumberSafe(price);
                num = Math.min(Math.max(num, 0), LIMITS.maxPrice);
                if (num > 0 && num < MIN_PRICE_EUR) num = MIN_PRICE_EUR;
                setPrice(num.toFixed(2));
              }}
              type="text"
              inputMode="decimal"
              inputProps={{
                min: MIN_PRICE_EUR,
                max: LIMITS.maxPrice,
                step: 0.01,
              }}
              helperText={
                tooLow
                  ? `Minimum price is €${MIN_PRICE_EUR.toFixed(2)}.`
                  : `Enter a price between €${MIN_PRICE_EUR.toFixed(
                      2
                    )} and €${
                      (LIMITS.maxPrice as number).toFixed?.(2) ??
                      LIMITS.maxPrice
                    }.`
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
