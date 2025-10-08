// src/components/LoadingOverlay.tsx
import { Backdrop, CircularProgress } from "@mui/material";
import type { Theme } from "@mui/material/styles";

type ZIndexProp = number | ((theme: Theme) => number);

type Props = {
  open: boolean;
  /** Optional: override zIndex if needed */
  zIndex?: ZIndexProp;
  /** Optional: CSS backdrop-filter value */
  blur?: string;
};

export default function LoadingOverlay({
  open,
  zIndex,
  blur = "blur(1px)",
}: Props) {
  const resolvedZIndex: ZIndexProp =
    zIndex ?? ((theme: Theme) => theme.zIndex.drawer + 2);

  return (
    <Backdrop
      open={open}
      sx={(theme: Theme) => ({
        color: "#fff",
        zIndex:
          typeof resolvedZIndex === "function"
            ? resolvedZIndex(theme)
            : resolvedZIndex,
        backdropFilter: blur,
      })}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  );
}
