// Job di ingestione "pesante": usa un browser reale (Playwright)
// invece di un semplice fetch, per le fonti che bloccano le richieste
// automatiche (rilevamento bot). Gira meno spesso del job leggero
// (ogni 30 min) perché più costoso in tempo/risorse CI.
//
// Richiede le stesse variabili d'ambiente del job leggero:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY nell'ambiente.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function upsertSnapshot(id, module, zone, data) {
  const { error } = await supabase
    .from("snapshots")
    .upsert({ id, module, zone, data, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Upsert fallito per ${id}: ${error.message}`);

  const { error: histError } = await supabase.from("history").insert({ module, zone, data });
  if (histError) console.warn(`Storico non salvato per ${module}: ${histError.message}`);
}

// Carica una pagina con un browser reale e restituisce l'HTML finale
// (dopo l'esecuzione di eventuale JavaScript) — necessario per i siti
// che bloccano un fetch semplice ma lasciano passare un browser vero.
async function estraiHtmlConBrowser(browser, url) {
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);
    return await page.content();
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------
// BASEBALL — fibs.it (Federazione Italiana Baseball Softball). Blocca
// un fetch semplice (HTTP 403, verificato) ma lascia passare un
// browser reale — struttura HTML verificata manualmente via devtools,
// stessa logica di parsing già usata per FIP/basket.
//
// Solo Serie A Silver per ora, squadra FVG di riferimento: GEREON
// Engineering NBP Ronchi (Ronchi dei Legionari).
// ---------------------------------------------------------------------

const COMPETIZIONI_BASEBALL = [
  {
    slug: "serie-a-silver",
    nome: "Serie A Silver",
    urlCalendario:
      "https://www.fibs.it/it/events/2026-serie-a-silver-baseball/calendars?committee=0&round=&team=Squadra&date=",
    urlClassifica: "https://www.fibs.it/it/events/2026-serie-a-silver-baseball/standings",
  },
];

async function ingestBaseballCompetizione(browser, comp) {
  const [htmlCal, htmlClass] = await Promise.all([
    estraiHtmlConBrowser(browser, comp.urlCalendario).catch((err) => {
      console.warn(`Calendario baseball "${comp.nome}" non caricato: ${err.message}`);
      return null;
    }),
    estraiHtmlConBrowser(browser, comp.urlClassifica).catch((err) => {
      console.warn(`Classifica baseball "${comp.nome}" non caricata: ${err.message}`);
      return null;
    }),
  ]);

  const partite = [];
  if (htmlCal) {
    const $ = cheerio.load(htmlCal);
    $(".schedule-item.baseball").each((_, el) => {
      const divs = $(el).find("> a > div");
      const dataOra = $(divs[1]).find("p").eq(1).text().trim();
      const luogo = $(divs[0]).find("p").eq(1).text().trim();

      const squadre = $(el).find(".team-info");
      if (squadre.length < 2) return;
      const ospite = $(squadre[0]).find("p").eq(2).text().trim();
      const locali = $(squadre[1]).find("p").eq(2).text().trim();

      const punteggioTesto = $(el).find(".baseball-score-bug > div").eq(1).find("p").first().text().trim();
      const [puntiOspite, puntiLocali] = punteggioTesto.split(":").map((s) => s.trim());

      const stato = $(el).find(".game-label strong").text().trim();

      if (ospite && locali) {
        partite.push({
          ospite,
          locali,
          puntiOspite: puntiOspite || null,
          puntiLocali: puntiLocali || null,
          dataOra,
          luogo,
          stato: stato || null,
        });
      }
    });
  }

  const classifica = [];
  if (htmlClass) {
    const $ = cheerio.load(htmlClass);
    $("tr").each((_, tr) => {
      const nomeSmall = $(tr).find(".team-name small");
      if (!nomeSmall.length) return;
      const celle = $(tr).find("td");
      if (celle.length < 8) return;
      classifica.push({
        posizione: $(celle[0]).text().trim(),
        squadra: nomeSmall.text().trim(),
        vittorie: $(celle[3]).text().trim(),
        sconfitte: $(celle[4]).text().trim(),
        percentuale: $(celle[6]).text().trim(),
        partiteDietro: $(celle[7]).text().trim(),
      });
    });
  }

  if (partite.length === 0 && classifica.length === 0) {
    console.warn(`Nessun dato baseball estratto per "${comp.nome}" — la struttura HTML potrebbe essere cambiata`);
    return;
  }

  await upsertSnapshot(`baseball:${comp.slug}`, "baseball", null, {
    campionato: comp.nome,
    partite,
    classifica,
    aggiornato_al: new Date().toISOString(),
  });
  console.log(`Baseball aggiornato (${comp.nome}): ${partite.length} partite, ${classifica.length} squadre`);
}

// ---------------------------------------------------------------------

async function main() {
  const browser = await chromium.launch();
  try {
    for (const comp of COMPETIZIONI_BASEBALL) {
      try {
        await ingestBaseballCompetizione(browser, comp);
      } catch (err) {
        console.error(`Errore su "${comp.nome}":`, err.message);
      }
    }
  } finally {
    await browser.close();
  }
}

main();
