// src/main.tsx (or App.tsx)
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./homepage/HomePage";
import CreatePage from "./createpage/CreatePage";
import CoursePage from "./coursepage/CoursePage";
import ProtectedRoute from "./components/ProtectedRoute"; // keeps auth-only for course
import CreatorRoute from "./CreatorRoute";     // NEW: requires Stripe onboarding
import { ReturnPage } from "./ReturnPage";

export function RefreshPage() { return <div>Onboarding expired, retrying…</div>; }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/return/:accountId" element={<ReturnPage />} />
        <Route path="/refresh/:accountId" element={<RefreshPage />} />

        {/* Must be signed in AND Stripe-onboarded */}
        <Route
          path="/create"
          element={
            <CreatorRoute>
              <CreatePage />
            </CreatorRoute>
          }
        />

        {/* Signed-in only (viewer/learner) */}
        <Route
          path="/course/:courseId"
          element={
            <ProtectedRoute>
              <CoursePage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
