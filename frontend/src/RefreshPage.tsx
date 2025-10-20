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