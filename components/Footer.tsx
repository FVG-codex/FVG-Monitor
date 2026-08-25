import type { ReactNode } from "react";
import Link from "next/link";

// Footer condiviso da tutte le pagine del sito (stesso pattern di
// TopHeader: importato e reso da ogni pagina, non da app/layout.tsx —
// così ogni pagina resta libera di aggiungere una riga extra, es. le
// fonti in homepage, tramite `extra`).
//
// Contiene il link al registro modifiche (/changelog, vedi
// lib/changelog.ts) — richiesto dall'utente il 25/08/2026 per avere
// una cronologia sempre aggiornata di cosa cambia sul sito.
export function Footer({ extra }: { extra?: ReactNode }) {
  return (
    <footer className="max-w-[1180px] mx-auto px-5 py-6 border-t border-line font-mono text-[11px] text-ink-faint flex justify-between flex-wrap gap-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span>FVG Monitor</span>
        <Link href="/changelog" className="hover:text-cool transition-colors">
          Registro modifiche →
        </Link>
      </div>
      {extra}
    </footer>
  );
}
