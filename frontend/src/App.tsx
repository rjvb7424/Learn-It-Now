// src/main.tsx (or your router file)
/*
import { BrowserRouter, Routes, Route } from "react-router-dom";
import StripeOnboardingTest from "./StripeOnboardingTest";

export function ReturnPage() { return <div>Returned from Stripe ✅</div>; }
export function RefreshPage() { return <div>Onboarding expired, retrying…</div>; }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StripeOnboardingTest />} />
        <Route path="/return/:accountId" element={<ReturnPage />} />
        <Route path="/refresh/:accountId" element={<RefreshPage />} />
      </Routes>
    </BrowserRouter>
  );
}
*/

// frontend/src/App.tsx
// src/App.tsx
import HomePage from "./homepage/HomePage";
// ...other imports

export default function App() {
  return (
    <HomePage />
  );
}
