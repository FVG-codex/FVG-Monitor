"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { MenuHamburger } from "@/components/MenuHamburger";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PROVINCE_LIST } from "@/lib/province";
import { ThemeToggle } from "@/components/ThemeToggle";
import { intlLocale } from "@/lib/intlLocale";

// Titolo di sezione accanto a "FVG MONITOR" (09/10/2026, richiesto
// dall'utente: "FVG MONITOR - VIABILITÀ"). Il sito NON ha un albero di
// route annidato sotto app/[locale]/ — ogni pagina, anche quelle
// concettualmente "dentro" un hub come Sanità o Turismo, è una route di
// primo livello (es. /dentisti, non /sanita/dentisti, vedi
// app/[locale]/dentisti/page.tsx) — quindi questa tabella è
// deliberatamente piatta, una voce per ogni pagina del sito, invece di
// provare a derivare il titolo dalla struttura dell'URL.
//
// Ogni voce è la chiave puntata da passare al traduttore "radice"
// (`useTranslations()` senza namespace — restituisce l'intero albero
// `messages/it.json`, vedi use-intl/dist/types/react/useTranslations.d.ts:
// "If no namespace is provided, all available messages are returned")
// invece di un'etichetta fissa, per restare tradotto nelle 5 lingue.
// Scelta la stessa chiave già usata dall'intestazione <h1> di quella
// pagina (vedi i rispettivi componenti in components/*.tsx) così il
// sottotitolo nell'header corrisponde sempre al titolo della pagina.
const TITOLO_SEZIONE_CHIAVE: Record<string, string> = {
  // Hub principali (stessa chiave "nav.*" usata dall'hamburger — vedi
  // MenuHamburger.tsx)
  "/meteo": "nav.meteo",
  "/notizie": "nav.notizie",
  "/ambiente": "nav.ambiente",
  "/sport": "nav.sport",
  "/fvg-in-immagini": "nav.immagini",
  "/viabilita": "nav.viabilita",
  "/trasporti": "nav.trasporti",
  "/aviazione": "nav.aviazione",
  "/sanita": "nav.sanita",
  "/turismo": "nav.turismo",
  "/economia": "nav.economia",
  "/commercio": "nav.commercio",
  // Sanità
  "/dentisti": "sanita.sezioni.dentisti.nome",
  "/veterinari": "sanita.sezioni.veterinari.nome",
  "/pronto-soccorso": "sanita.sezioni.prontoSoccorso.nome",
  "/farmacie": "sanita.sezioni.farmacie.nome",
  "/farmacie-di-turno": "farmacie.titoloTurno",
  "/farmacie-tutte": "farmacie.titoloTutte",
  "/cliniche": "inArrivoPages.cliniche",
  // Turismo
  "/eventi": "turismo.sezioni.eventi.nome",
  "/neve-impianti": "turismo.sezioni.neveImpianti.nome",
  "/piste-ciclabili": "turismo.sezioni.pisteCiclabili.nome",
  "/strutture-ricettive": "turismo.sezioni.struttureRicettive.nome",
  "/agriturismi": "struttureRicettive.tipi.agriturismi.nome",
  "/affittacamere": "struttureRicettive.tipi.affittacamere.nome",
  "/alberghi-diffusi": "struttureRicettive.tipi.alberghi-diffusi.nome",
  "/bed-and-breakfast": "struttureRicettive.tipi.bb.nome",
  "/campeggi": "struttureRicettive.tipi.campeggi.nome",
  "/marina": "struttureRicettive.tipi.marina.nome",
  "/rifugi": "struttureRicettive.tipi.rifugi.nome",
  "/strutture-sociali": "struttureRicettive.tipi.sociali.nome",
  // Ambiente
  "/dati-ambientali": "datiAmbientali.titolo",
  "/terremoti": "ambiente.sezioni.terremoti.nome",
  "/maree": "ambiente.sezioni.maree.nome",
  // Servizi
  "/servizi": "servizi.titolo",
  "/rifiuti": "servizi.sezioni.rifiuti.nome",
  // FVG in immagini
  "/webcam": "fvgInImmagini.sezioni.webcam.nome",
  "/galleria": "inArrivoPages.galleria",
  // Commercio
  "/supermercati": "commercio.categorie.supermercati.nome",
  "/colonnine-elettriche": "viabilita.colonnineElettriche",
  // Altro
  "/changelog": "changelogPage.titolo",
};

// Le 5 pagine sotto "Sport" (09/10/2026): a differenza di tutte le
// altre, qui non esiste una chiave di traduzione breve e stabile da
// riusare — il loro namespace ha solo un titolo lungo e descrittivo
// (es. sci.titolo = "Sci — Calendario gare FVG") o, per calcio/basket/
// baseball, un titolo CALCOLATO a runtime dai dati del campionato
// (`dati.campionato`, non disponibile qui in TopHeader). La stessa
// pagina hub (app/[locale]/sport/page.tsx) non è ancora stata
// multilingua (testo fisso "Calcio"/"Basket"/ecc., coerente con questa
// scelta) — stessa etichetta breve riusata qui, invece di inventare
// chiavi di traduzione nuove per un solo sottotitolo d'intestazione.
const TITOLO_SEZIONE_FISSO: Record<string, string> = {
  "/calcio": "Calcio",
  "/basket": "Basket",
  "/baseball": "Baseball & Softball",
  "/tennis": "Tennis",
  "/sci": "Sci",
};

export function TopHeader({ paginaAttiva }: { paginaAttiva?: "regione" | string }) {
  const t = useTranslations("chrome");
  const tTutto = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const [ora, setOra] = useState<string>("");
  const [data, setData] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setOra(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
      setData(
        now.toLocaleDateString(intlLocale(locale), {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [locale]);

  const voci = [{ label: t("allRegion"), href: "/", key: "regione" }, ...PROVINCE_LIST.map((p) => ({ label: p.nome, href: `/${p.slug}`, key: p.slug }))];

  // Homepage e Meteo (09/10/2026, richiesto dall'utente): sia il
  // selettore di provincia (il <nav> sotto, visibile nello screenshot
  // allegato dall'utente) sia il selettore di lingua restano visibili
  // SOLO su queste due pagine — ovunque altro spariscono
  // dall'intestazione. Motivo pratico oltre a quello estetico: su
  // mobile (verificato con Playwright in emulazione Android, viewport
  // 412px) il <nav> a 5 pulsanti più il selettore di lingua a 5
  // bandierine andavano a capo su 3 righe, portando l'header sticky a
  // ~193px di altezza — quasi un quarto dello schermo di un telefono,
  // rimanendo poi incollato in cima per tutta la pagina e coprendo
  // visibilmente l'inizio del contenuto sotto (il primo riquadro
  // arrivava letteralmente nascosto sotto il bordo dell'header appena
  // si scrollava) — questo è con ogni probabilità il problema di
  // responsività segnalato dall'utente ("non rimane in alto ma viene
  // nascosto dai vari box"). Su tutte le altre pagine l'header ora
  // contiene solo amburger+logo a sinistra e orologio+tema a destra:
  // una sola riga anche su schermi stretti.
  const isHomepage = pathname === "/";
  const isMeteo = pathname === "/meteo";
  const mostraSelettoreProvincia = isHomepage || isMeteo;
  const mostraSelettoreLingua = isHomepage;

  // Titolo di sezione accanto a "FVG MONITOR" (vedi le due tabelle in
  // testa al file). Le pagine provincia (/trieste ecc.) non sono in
  // `TITOLO_SEZIONE_CHIAVE` — il nome provincia viene già da
  // `PROVINCE_LIST`, la stessa fonte usata per `voci` sopra, invece di
  // duplicarlo in una terza tabella.
  const titoloSezione = useMemo(() => {
    if (isHomepage) return null;
    const provincia = PROVINCE_LIST.find((p) => `/${p.slug}` === pathname);
    if (provincia) return provincia.nome;
    if (pathname in TITOLO_SEZIONE_FISSO) return TITOLO_SEZIONE_FISSO[pathname];
    const chiave = TITOLO_SEZIONE_CHIAVE[pathname];
    if (!chiave) return null;
    try {
      // Chiave costruita a runtime dalla tabella sopra, non un literal
      // type — stesso pattern già usato altrove nel sito (es.
      // `t(`sezioni.${s.key}.nome`)` in SanitaPage.tsx/TurismoPage.tsx),
      // che compila senza bisogno di soppressioni: questo progetto non
      // ha un augmentation globale che vincoli le chiavi di next-intl a
      // literal type (nessun global.d.ts con `IntlMessages`).
      const valore = tTutto(chiave);
      return typeof valore === "string" ? valore : null;
    } catch {
      // Difensivo: se una chiave della tabella statica sopra non esiste
      // più in messages/*.json (es. rinominata altrove), non deve far
      // sparire l'intero header — semplicemente non mostra il sottotitolo.
      return null;
    }
  }, [isHomepage, pathname, tTutto]);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="max-w-[1180px] mx-auto px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <MenuHamburger />
          <div className="flex items-baseline gap-x-2 gap-y-0.5 flex-wrap min-w-0">
            <Link href="/" className="font-cond font-bold text-[22px] tracking-[0.06em] uppercase flex items-baseline gap-2 flex-shrink-0">
              <span className="w-[7px] h-[7px] rounded-full bg-cool inline-block pulse-dot" />
              {t("siteName")}
            </Link>
            {/* Niente `truncate` (09/10/2026): su schermi molto stretti
                (~360px, verificato con Playwright) un titolo lungo come
                "Dentisti & Odontoiatri" troncato con ellissi diventava
                illeggibile ("– DEN…"). `flex-wrap` sul contenitore sopra
                lo fa invece scendere a capo sotto "FVG MONITOR" quando
                non c'è spazio, restando sempre leggibile per intero. */}
            {titoloSezione && (
              <span className="font-cond font-semibold text-sm tracking-[0.04em] uppercase text-ink-faint">
                – {titoloSezione}
              </span>
            )}
          </div>
        </div>

        {mostraSelettoreProvincia && (
          <nav aria-label={t("provinceNav")} className="flex gap-0.5 font-cond font-semibold text-sm flex-wrap">
            {voci.map((voce) => (
              <Link
                key={voce.key}
                href={voce.href}
                aria-current={voce.key === paginaAttiva ? "page" : undefined}
                className={`px-3 py-1.5 rounded border transition-colors ${
                  voce.key === paginaAttiva
                    ? "bg-cool border-cool text-on-accent"
                    : "border-line text-ink-dim hover:text-ink hover:border-ink-faint"
                }`}
              >
                {voce.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <div className="font-mono text-right leading-relaxed">
            <div className="text-[13px] text-ink-dim">{ora}</div>
            <div className="text-xs text-ink-faint">{data}</div>
          </div>
          {mostraSelettoreLingua && <LanguageSwitcher />}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
