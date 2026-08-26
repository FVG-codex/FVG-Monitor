import type { StatoApertura } from "@/lib/farmacie";

// Pallino verde/rosso + etichetta testuale (26/08/2026, richiesto
// dall'utente per le pagine Farmacie) — il pallino è puramente
// decorativo (`aria-hidden`), il colore non è mai l'unico modo di
// comunicare lo stato (lezione permanente Fase 4 — Accessibilità),
// l'etichetta testuale porta l'informazione. Stesso pattern già in uso
// in BalneazionePanel.tsx/ViabilitaPanel.tsx. Nessun pallino per lo
// stato "sconosciuto" (farmacia senza orari nella finestra dati odierna)
// — vedi statoApertura() in lib/farmacie.ts.
export function StatoApertoBadge({ stato }: { stato: StatoApertura }) {
  if (stato === "sconosciuto") return null;
  const aperta = stato === "aperta";
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span aria-hidden="true" className={`w-2 h-2 rounded-full flex-shrink-0 ${aperta ? "bg-allerta-verde" : "bg-allerta-rossa"}`} />
      <span className="font-mono text-[10px] text-ink-faint uppercase whitespace-nowrap">
        {aperta ? "Aperta ora" : "Chiusa ora"}
      </span>
    </span>
  );
}
