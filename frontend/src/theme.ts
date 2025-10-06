// src/theme.ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    // primary is white
    primary: {
      main: "#ffffff",
      contrastText: "#000000",
    },
    // optional: keep background very dark so the AppBar blends in
    background: {
    },
    text: {
      primary: "#ffffff",
      secondary: "rgba(255,255,255,0.7)",
    },
  },
  components: {
    // Buttons use white for all variants when color="primary"
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          backgroundColor: "#ffffff",
          color: "#000000",
          "&:hover": { backgroundColor: "#e9e9e9" },
          "&:active": { backgroundColor: "#dcdcdc" },
        },
        outlinedPrimary: {
          borderColor: "#ffffff",
          color: "#ffffff",
          "&:hover": { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.08)" },
        },
        textPrimary: {
          color: "#ffffff",
          "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
        },
      },
    },

    // Outlined TextFields (e.g., your SearchBar) use white when focused/hovered
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.3)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#ffffff" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#ffffff" },
        },
        input: {
          color: "#ffffff",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "rgba(255,255,255,0.7)",
          "&.Mui-focused": { color: "#ffffff" },
        },
      },
    },

    // Switches/Checkboxes/Radio checked color → white
    MuiCheckbox: { styleOverrides: { root: { color: "rgba(255,255,255,0.7)", "&.Mui-checked": { color: "#ffffff" } } } },
    MuiRadio:    { styleOverrides: { root: { color: "rgba(255,255,255,0.7)", "&.Mui-checked": { color: "#ffffff" } } } },
    MuiSwitch:   { styleOverrides: { switchBase: { "&.Mui-checked": { color: "#ffffff" } }, track: { backgroundColor: "rgba(255,255,255,0.3)", ".Mui-checked + &": { backgroundColor: "#ffffff" } } } },

    // AppBar: ensure no accidental background
    MuiAppBar: {
      defaultProps: { color: "transparent", enableColorOnDark: true, elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
          backgroundImage: "none",
          boxShadow: "none",
        },
      },
    },

    // Links look white
    MuiLink: {
      styleOverrides: {
        root: { color: "#ffffff" },
      },
    },

    // Icon buttons ripple/selected color → white-ish
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: "rgba(255,255,255,0.9)",
          "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
        },
      },
    },
  },
});

export default theme;
