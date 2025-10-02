// src/main.tsx (or App.tsx)
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./homepage/HomePage";
import CreatePage from "./createpage/CreatePage";
import CoursePage from "./coursepage/CoursePage";
import StripeOnboardingTest from "./StripeOnboardingTest";
import ProtectedRoute from "./components/ProtectedRoute";
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

        {/* Protected routes (must be signed in) */}
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/course/:courseId"
          element={
            <ProtectedRoute>
              <CoursePage />
            </ProtectedRoute>
          }
        />

        {/* (optional) 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
