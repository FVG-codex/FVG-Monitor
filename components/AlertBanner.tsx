type Livello = "gialla" | "arancione" | "rossa";

const LIVELLO_STYLES: Record<Livello, string> = {
  gialla: "bg-allerta-gialla text-[#241B04]",
  arancione: "bg-allerta-arancione text-[#241B04]",
  rossa: "bg-allerta-rossa text-ink",
};

/**
 * Banner mostrato solo quando esiste un'allerta attiva.
 * Se non ci sono allerte in corso, il componente non va renderizzato
 * (vedi logica in page.tsx quando si collegano i dati reali in Fase 1).
 */
export function AlertBanner({
  livello,
  messaggio,
  href,
}: {
  livello: Livello;
  messaggio: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 font-cond text-[15px] border-b border-line">
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide flex-shrink-0 ${LIVELLO_STYLES[livello]}`}
      >
        Allerta {livello}
      </span>
      <span className="text-ink-dim">{messaggio}</span>
      {href && (
        <a href={href} className="ml-auto text-cool text-sm flex-shrink-0 whitespace-nowrap">
          Dettagli ufficiali →
        </a>
      )}
    </div>
  );
}
