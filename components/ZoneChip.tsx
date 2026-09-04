type Zone = "A" | "B" | "C" | "D";

const ZONE_STYLES: Record<Zone, string> = {
  A: "bg-zone-a text-on-accent",
  B: "bg-zone-b text-on-accent",
  C: "bg-zone-c text-[#241B04]",
  // Testo bianco invece di text-on-accent: contro il colore zone-d (arancio-bruno)
  // il testo scuro restava sotto la soglia WCAG 4.5:1 (era 3.58:1, vedi
  // anche la nota su zone.d in tailwind.config.ts). Bianco arriva a 4.54:1.
  D: "bg-zone-d text-white",
};

/**
 * Chip che identifica una delle 4 zone di allerta ufficiali della
 * Protezione Civile FVG (FVG-A/B/C/D). Riusato in meteo, allerte,
 * viabilità: è il filo conduttore visivo del sito, non decorazione.
 */
export function ZoneChip({
  zone,
  size = "sm",
}: {
  zone: Zone;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-[18px] h-[18px] text-[10px]" : "w-[22px] h-[22px] text-xs";
  return (
    <span
      className={`inline-flex items-center justify-center rounded font-mono font-medium ${dim} ${ZONE_STYLES[zone]}`}
      title={`Zona di allerta ${zone}`}
    >
      {zone}
    </span>
  );
}
