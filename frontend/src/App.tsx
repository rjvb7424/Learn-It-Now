// src/main.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import StripeOnboardingTest from "./StripeOnboardingTest";
import CreatePage from "./createpage/CreatePage";
import HomePage from "./homepage/HomePage";
import ProtectedRoute from "./components/ProtectedRoute";
import CoursePage from "./coursepage/CoursePage";

export function ReturnPage() {
  return <div>Returned from Stripe ✅</div>;
}
export function RefreshPage() {
  return <div>Onboarding expired, retrying…</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreatePage />
              <Route path="/course/:courseId" element={<CoursePage />} />
            </ProtectedRoute>
          }
        />
        <Route path="/return/:accountId" element={<ReturnPage />} />
        <Route path="/refresh/:accountId" element={<RefreshPage />} />
      </Routes>
    </BrowserRouter>
  );
}
