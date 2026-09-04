import { TopHeader } from "@/components/TopHeader";
import { Footer } from "@/components/Footer";
import { Panel } from "@/components/Panel";
import { CHANGELOG } from "@/lib/changelog";

// Registro modifiche (/changelog) — richiesto dall'utente il 25/08/2026:
// un log pubblico, linkato dal footer di ogni pagina (Footer.tsx), che
// tiene traccia di ogni modifica consegnata. Dati statici in
// lib/changelog.ts (nessuna ingestione/Supabase: non è un dato che
// cambia da solo, cambia solo quando consegniamo qualcosa di nuovo).
export function ChangelogPage() {
  return (
    <>
      <TopHeader />
      <div className="isobar" />

      <main id="contenuto-principale" className="max-w-[1180px] mx-auto px-5 py-6">
        <h1 className="font-cond font-bold text-2xl uppercase tracking-wide mb-1">Registro modifiche</h1>
        <p className="text-ink-faint text-xs font-mono mb-6">
          Cronologia di ciò che è stato aggiunto o corretto su FVG Monitor, più recente in cima. Le voci
          precedenti al 22/08/2026 non hanno una data esatta registrata.
        </p>

        <div className="grid grid-cols-1 gap-px bg-line border border-line">
          <Panel title={`${CHANGELOG.length} voci`}>
            <div className="flex flex-col">
              {CHANGELOG.map((voce, i) => (
                <div key={i} className={`py-3.5 ${i > 0 ? "border-t border-line" : ""}`}>
                  <div className="font-mono text-[10px] text-cool-ink uppercase mb-1">{voce.data}</div>
                  <div className="font-cond font-semibold text-base uppercase tracking-wide mb-1.5">
                    {voce.titolo}
                  </div>
                  <ul className="text-sm text-ink-dim flex flex-col gap-1">
                    {voce.dettagli.map((d, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-ink-faint shrink-0" aria-hidden="true">
                          —
                        </span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </main>

      <Footer />
    </>
  );
}
