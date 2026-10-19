import { Suspense } from "react";
import { LoginPage } from "@/components/LoginPage";

// Suspense richiesto da Next.js per useSearchParams() in un Client
// Component renderizzato come pagina (legge `?next=`, vedi LoginPage.tsx) —
// senza, il build statico fallisce con "should be wrapped in a suspense
// boundary". Nessun fallback visibile serve: la pagina è già minimale e il
// contenuto arriva in pochi millisecondi lato client.
export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
