// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

import HomePage from "./homepage/HomePage";
import CreatePage from "./createpage/CreatePage";
import CoursePage from "./coursepage/CoursePage";
import ProtectedRoute from "./components/ProtectedRoute";
import CreatorRoute from "./CreatorRoute";
import { ReturnPage } from "./ReturnPage";
import AcquiredCoursesPage from "./PurchasesPage";
import MyCoursesPage from "./CreatedCoursesPage";
import CheckoutSuccess from "./CheckoutSuccess";
import TermsOfService from "./TermsOfService";
import { useParams } from "react-router-dom";
import { useEffect } from "react";

export function RefreshPage() {
  const { accountId } = useParams<{ accountId: string }>();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/__/functions/createAccountLink", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        });
        const j = await r.json();
        if (j?.url) window.location.replace(j.url);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [accountId]);

  return <div>Onboarding expired, retrying…</div>;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline applies sensible dark defaults (background, text, etc.) */}
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/return/:accountId" element={<ReturnPage />} />
          <Route path="/refresh/:accountId" element={<RefreshPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />

          {/* Auth-only */}
          <Route path="/purchases" element={<ProtectedRoute><AcquiredCoursesPage /></ProtectedRoute>} />
          <Route path="/my-courses" element={<ProtectedRoute><MyCoursesPage /></ProtectedRoute>} />

          {/* Creator-only */}
          <Route path="/create" element={<CreatorRoute><CreatePage /></CreatorRoute>} />

          {/* Course viewing */}
          <Route path="/course/:courseId" element={<ProtectedRoute><CoursePage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
