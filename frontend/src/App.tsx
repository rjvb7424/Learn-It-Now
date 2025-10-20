// external imports
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";

// internal imports
import HomePage from "./homepage/HomePage";
import CreatePage from "./createpage/CreatePage";
import CoursePage from "./coursepage/CoursePage";
import ProtectedRoute from "./components/ProtectedRoute";
import CreatorRoute from "./CreatorRoute";
import { ReturnPage } from "./ReturnPage";
import { RefreshPage } from "./RefreshPage"
import AcquiredCoursesPage from "./PurchasesPage";
import MyCoursesPage from "./CreatedCoursesPage";
import CheckoutSuccess from "./CheckoutSuccess";
import TermsOfService from "./TermsOfService";

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
