"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// Pulsante "Esci" nel footer (19/10/2026) — vedi lib/auth.ts e
// middleware.ts. Componente a sé (invece di rendere Footer.tsx un intero
// Client Component) perché Footer resta un Server Component come il resto
// del sito. Usa next/navigation (non @/i18n/navigation): dopo il logout
// deve atterrare sul percorso grezzo /login, che il middleware gestisce
// già con next-intl — non serve il router locale-aware qui.
export function LogoutButton() {
  const t = useTranslations("footer");
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="hover:text-cool-ink transition-colors">
      {t("esci")}
    </button>
  );
}
