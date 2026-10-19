"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PROVINCE_LIST } from "@/lib/province";
import { BLSD_META, conteggioBlsdProvincia } from "@/lib/blsd";

// Homepage → riepilogo DAE/BLSD (15/10/2026) — vedi nota in page.tsx e
// lib/blsd.ts per fonte/limiti. Solo conteggi + link alla pagina dedicata
// /blsd: stesso pattern del riepilogo "Allerte" (vedi AllertaZonePanel +
// elenco Link per provincia in page.tsx), niente mappa qui in homepage.
export function BlsdHomeRiepilogo() {
  const t = useTranslations("home");

  return (
    <div>
      <p className="font-cond font-bold text-3xl leading-none">{BLSD_META.totaleRegione}</p>
      <p className="text-ink-faint text-xs font-mono mb-2">{t("blsd.sottotitolo")}</p>
      <p className="text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed mb-2">
        ⚠ {t("blsd.disclaimerBreve")}
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-mono text-ink-faint mb-2">
        {PROVINCE_LIST.map((p) => (
          <span key={p.slug}>
            {p.nome}: {conteggioBlsdProvincia(p.slug)}
          </span>
        ))}
      </div>
      <Link href="/blsd" className="text-xs font-mono text-cool-ink hover:underline">
        {t("blsd.vaiAllaPagina")} →
      </Link>
    </div>
  );
}
