// src/App.tsx
function App() {
  const handleClick = async () => {
    try {
      const FUNCTIONS_BASE = "https://us-central1-<YOUR_PROJECT_ID>.cloudfunctions.net";

      // 1) Create (or fetch) the connected account
      const r1 = await fetch(`${FUNCTIONS_BASE}/createConnectedAccount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: "test-uid-123", email: "test@example.com" }),
      });
      if (!r1.ok) throw new Error(await r1.text());
      const { accountId } = await r1.json();

      // 2) Get onboarding link
      const r2 = await fetch(`${FUNCTIONS_BASE}/createOnboardingLink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (!r2.ok) throw new Error(await r2.text());
      const { url } = await r2.json();

      // 3) Redirect
      window.location.href = url;
    } catch (e) {
      console.error(e);
      alert("Failed to start onboarding. Check console.");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <button onClick={handleClick} style={{ padding: 12, fontSize: 16 }}>
        Create Connected Account
      </button>
    </div>
  );
}
export default App;
