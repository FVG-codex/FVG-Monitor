// =====================================================================
// FVG MONITOR — pubblicazione automatica sui social (18/11/2026)
// =====================================================================
//
// Eseguito da .github/workflows/social.yml ogni 15 minuti nella fascia
// oraria in cui ci sono post programmati. Nessuna dipendenza npm: solo
// fetch/FormData nativi di Node 22, così il workflow non deve fare
// `npm install`.
//
// Flusso per ogni voce di PROGRAMMA:
//   1. è il momento? (orario locale Europe/Rome, gestisce da solo il
//      cambio ora legale/solare — il cron di GitHub è in UTC e spesso
//      in ritardo di qualche minuto, per questo c'è una "finestra")
//   2. già pubblicato oggi? → registro su Supabase, tabella social_post
//      (supabase/social.sql). Le piattaforme già riuscite non vengono
//      mai ripubblicate; quelle fallite si ritentano al giro dopo.
//   3. testi da GET {SITO}/api/social/<tipo>, card JPEG da
//      {SITO}/api/social/<tipo>/immagine (app/api/social/…).
//   4. pubblicazione su Telegram, Facebook, Instagram + bozza WhatsApp
//      inviata in privato su Telegram (il canale WhatsApp non ha API
//      ufficiali: la bozza si inoltra a mano dal telefono).
//
// Le piattaforme senza credenziali vengono saltate (con un avviso): si
// può partire con il solo Telegram e aggiungere Meta in un secondo
// momento senza toccare il codice.
//
// Modalità (variabile SOCIAL_MODO, impostabile da "Run workflow"):
//   auto      (default) rispetta orari e registro
//   anteprima manda TUTTO solo nella chat privata di amministrazione,
//             ignora l'orario, non scrive nel registro → per le prove
//   forza     ignora l'orario ma rispetta il registro (niente doppioni)
// SOCIAL_TIPO: limita a un solo tipo (es. "meteo-mattino").
// SOCIAL_PIATTAFORME: limita a un elenco (es. "telegram,facebook").
// =====================================================================

/** Post programmati. `ora` = ora locale italiana, `finestraOre` = entro
 *  quanto tempo dopo l'orario il post ha ancora senso (oltre, si salta
 *  la giornata). Se aggiungi un orario fuori dalla fascia del cron in
 *  .github/workflows/social.yml, allarga anche quella. */
const PROGRAMMA = [
  {
    tipo: "meteo-mattino",
    ora: "07:30",
    finestraOre: 3,
    piattaforme: ["telegram", "facebook", "instagram", "whatsapp"],
  },
];

const MAX_TENTATIVI = 6;
const FUSO = "Europe/Rome";

const env = process.env;
const SITO = (env.SOCIAL_SITE_URL || "https://monitor.fvg.it").replace(/\/$/, "");
const MODO = (env.SOCIAL_MODO || "auto").trim();
const FILTRO_TIPO = (env.SOCIAL_TIPO || "").trim();
const FILTRO_PIATTAFORME = (env.SOCIAL_PIATTAFORME || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// Le due basi URL sono sovrascrivibili solo per i test locali con server finti
const GRAPH = `${env.META_GRAPH_BASE || "https://graph.facebook.com"}/${env.META_GRAPH_VERSION || "v23.0"}`;
const TELEGRAM_API = env.TELEGRAM_API_BASE || "https://api.telegram.org";

// ---------------------------------------------------------------------
// Utilità
// ---------------------------------------------------------------------

function oraLocale(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: FUSO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return { giorno: `${p.year}-${p.month}-${p.day}`, minuti: Number(p.hour) * 60 + Number(p.minute) };
}

const minutiDa = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchConTimeout(url, opzioni = {}, ms = 30_000) {
  return fetch(url, { ...opzioni, signal: AbortSignal.timeout(ms) });
}

function piattaformaConfigurata(p) {
  switch (p) {
    case "telegram":
      return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHANNEL_ID);
    case "whatsapp": // bozza inviata in privato su Telegram
      return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID);
    case "facebook":
      return Boolean(env.META_PAGE_ID && env.META_PAGE_TOKEN);
    case "instagram":
      return Boolean(env.META_IG_USER_ID && env.META_PAGE_TOKEN);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------
// Registro su Supabase (REST diretto, niente supabase-js)
// ---------------------------------------------------------------------

function intestazioniSupabase() {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function leggiRegistro(id) {
  const res = await fetchConTimeout(
    `${env.SUPABASE_URL}/rest/v1/social_post?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers: intestazioniSupabase() }
  );
  if (!res.ok) throw new Error(`Lettura social_post fallita (HTTP ${res.status}): ${await res.text()}`);
  const righe = await res.json();
  return righe[0] ?? null;
}

async function scriviRegistro(riga) {
  const res = await fetchConTimeout(`${env.SUPABASE_URL}/rest/v1/social_post`, {
    method: "POST",
    headers: { ...intestazioniSupabase(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ ...riga, aggiornato_il: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Scrittura social_post fallita (HTTP ${res.status}): ${await res.text()}`);
}

// ---------------------------------------------------------------------
// Telegram
// ---------------------------------------------------------------------

async function telegram(metodo, corpo) {
  const res = await fetchConTimeout(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/${metodo}`, {
    method: "POST",
    body: corpo,
    ...(corpo instanceof FormData ? {} : { headers: { "Content-Type": "application/json" } }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(`Telegram ${metodo}: ${json.description ?? `HTTP ${res.status}`}`);
  return json.result;
}

/** Foto (caricata come file, non come URL) + testo. Se il testo supera il
 *  limite delle didascalie (1024) va in un messaggio separato. */
async function telegramFotoETesto(chatId, jpeg, testo, parseMode) {
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("photo", new Blob([jpeg], { type: "image/jpeg" }), "fvg-monitor.jpg");
  const inDidascalia = testo.length <= 1024;
  if (inDidascalia) {
    form.append("caption", testo);
    if (parseMode) form.append("parse_mode", parseMode);
  }
  const foto = await telegram("sendPhoto", form);
  if (!inDidascalia) {
    await telegram(
      "sendMessage",
      JSON.stringify({
        chat_id: chatId,
        text: testo,
        ...(parseMode ? { parse_mode: parseMode } : {}),
        link_preview_options: { is_disabled: true },
      })
    );
  }
  return foto;
}

async function avvisaAdmin(testo) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) return;
  try {
    await telegram(
      "sendMessage",
      JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID, text: testo, link_preview_options: { is_disabled: true } })
    );
  } catch (err) {
    console.warn(`Avviso admin non inviato: ${err.message}`);
  }
}

// ---------------------------------------------------------------------
// Meta (Facebook Pagina + Instagram) — Graph API
// ---------------------------------------------------------------------

async function graph(percorso, parametri, metodo = "POST") {
  const query = new URLSearchParams({ ...parametri, access_token: env.META_PAGE_TOKEN });
  const res =
    metodo === "GET"
      ? await fetchConTimeout(`${GRAPH}/${percorso}?${query}`)
      : await fetchConTimeout(`${GRAPH}/${percorso}`, { method: "POST", body: query });
  const json = await res.json().catch(() => ({}));
  if (json.error) {
    const e = json.error;
    const scaduto = e.code === 190 ? " — TOKEN SCADUTO O REVOCATO, va rigenerato (docs/social.md)" : "";
    throw new Error(`Meta ${percorso}: ${e.message} (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""})${scaduto}`);
  }
  if (!res.ok) throw new Error(`Meta ${percorso}: HTTP ${res.status}`);
  return json;
}

async function pubblicaFacebook(urlImmagine, testo) {
  const r = await graph(`${env.META_PAGE_ID}/photos`, { url: urlImmagine, message: testo, published: "true" });
  return r.post_id ?? r.id;
}

async function pubblicaInstagram(urlImmagine, testo) {
  const contenitore = await graph(`${env.META_IG_USER_ID}/media`, { image_url: urlImmagine, caption: testo });
  // Il contenitore va elaborato da Meta prima di poterlo pubblicare
  for (let i = 0; i < 12; i++) {
    const s = await graph(contenitore.id, { fields: "status_code,status" }, "GET");
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
      throw new Error(`Instagram: contenitore in stato ${s.status_code} (${s.status ?? "nessun dettaglio"})`);
    }
    await attendi(5000);
  }
  const pubblicato = await graph(`${env.META_IG_USER_ID}/media_publish`, { creation_id: contenitore.id });
  return pubblicato.id;
}

// ---------------------------------------------------------------------
// Un post
// ---------------------------------------------------------------------

async function caricaContenuto(tipo, giorno) {
  const res = await fetchConTimeout(`${SITO}/api/social/${tipo}?giorno=${giorno}`);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) throw new Error(`Contenuto ${tipo}: HTTP ${res.status} ${json?.errore ?? ""}`);
  return json;
}

async function caricaImmagine(urlImmagine) {
  const res = await fetchConTimeout(urlImmagine, {}, 60_000);
  const tipo = res.headers.get("content-type") ?? "";
  if (!res.ok || !tipo.startsWith("image/jpeg")) {
    throw new Error(`Immagine non generata (HTTP ${res.status}, ${tipo}): ${(await res.text()).slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function pubblicaSu(piattaforma, { contenuto, jpeg, urlImmagine, giorno, tipo }) {
  const t = contenuto.testi;
  switch (piattaforma) {
    case "telegram": {
      const r = await telegramFotoETesto(env.TELEGRAM_CHANNEL_ID, jpeg, t.telegram, "HTML");
      return String(r.message_id);
    }
    case "facebook":
      return pubblicaFacebook(urlImmagine, t.facebook);
    case "instagram":
      return pubblicaInstagram(urlImmagine, t.instagram);
    case "whatsapp": {
      // Bozza: immagine + testo come messaggio a sé (senza formattazione
      // Telegram, così *grassetto* e _corsivo_ restano per WhatsApp).
      await telegramFotoETesto(env.TELEGRAM_ADMIN_CHAT_ID, jpeg, `📲 Bozza per il canale WhatsApp — ${tipo} ${giorno}\nInoltra l'immagine e copia il testo del messaggio qui sotto.`, null);
      const m = await telegram(
        "sendMessage",
        JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID, text: t.whatsapp, link_preview_options: { is_disabled: true } })
      );
      return String(m.message_id);
    }
    default:
      throw new Error(`Piattaforma sconosciuta: ${piattaforma}`);
  }
}

async function eseguiVoce(voce, adesso) {
  const { tipo } = voce;
  const { giorno, minuti } = adesso;
  const id = `${tipo}:${giorno}`;
  const etichetta = `[${id}]`;

  const piattaforme = voce.piattaforme.filter((p) => !FILTRO_PIATTAFORME.length || FILTRO_PIATTAFORME.includes(p));
  const attive = piattaforme.filter((p) => {
    if (piattaformaConfigurata(p)) return true;
    console.warn(`${etichetta} ${p}: credenziali mancanti, salto`);
    return false;
  });
  if (attive.length === 0) {
    console.warn(`${etichetta} nessuna piattaforma configurata`);
    return;
  }

  // --- Anteprima: tutto in privato, niente registro ---------------------
  if (MODO === "anteprima") {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) throw new Error("Anteprima: servono TELEGRAM_BOT_TOKEN e TELEGRAM_ADMIN_CHAT_ID");
    const contenuto = await caricaContenuto(tipo, giorno);
    if (!contenuto.pronto) {
      await avvisaAdmin(`👀 Anteprima ${id}: dati non pronti — ${contenuto.motivo}`);
      return;
    }
    const urlImmagine = `${SITO}/api/social/${tipo}/immagine?giorno=${giorno}&v=${Date.now()}`;
    const jpeg = await caricaImmagine(urlImmagine);
    const admin = env.TELEGRAM_ADMIN_CHAT_ID;
    await telegramFotoETesto(admin, jpeg, `👀 ANTEPRIMA ${id} — così apparirà su Telegram:`, null);
    await telegram("sendMessage", JSON.stringify({ chat_id: admin, text: contenuto.testi.telegram, parse_mode: "HTML", link_preview_options: { is_disabled: true } }));
    await telegram("sendMessage", JSON.stringify({ chat_id: admin, text: `— Facebook —\n\n${contenuto.testi.facebook}`, link_preview_options: { is_disabled: true } }));
    await telegram("sendMessage", JSON.stringify({ chat_id: admin, text: `— Instagram —\n\n${contenuto.testi.instagram}` }));
    await telegram("sendMessage", JSON.stringify({ chat_id: admin, text: `— WhatsApp —\n\n${contenuto.testi.whatsapp}`, link_preview_options: { is_disabled: true } }));
    console.log(`${etichetta} anteprima inviata in privato`);
    return;
  }

  // --- Orario -------------------------------------------------------------
  const inizio = minutiDa(voce.ora);
  const fine = inizio + voce.finestraOre * 60;
  if (MODO !== "forza" && (minuti < inizio || minuti > fine)) {
    console.log(`${etichetta} fuori orario (${voce.ora} + ${voce.finestraOre}h), salto`);
    return;
  }

  // --- Registro -----------------------------------------------------------
  const registro = (await leggiRegistro(id)) ?? { id, tipo, giorno, stato: "in_corso", tentativi: 0, esiti: {} };
  const daFare = attive.filter((p) => !registro.esiti?.[p]?.ok);
  if (daFare.length === 0) {
    console.log(`${etichetta} già pubblicato su ${attive.join(", ")}`);
    return;
  }
  if (registro.tentativi >= MAX_TENTATIVI) {
    console.log(`${etichetta} raggiunto il massimo di ${MAX_TENTATIVI} tentativi, salto`);
    return;
  }

  // --- Contenuto ----------------------------------------------------------
  const contenuto = await caricaContenuto(tipo, giorno);
  if (!contenuto.pronto) {
    console.log(`${etichetta} dati non pronti: ${contenuto.motivo}`);
    // Ultimo giro utile della finestra: avvisa che oggi il post salta
    if (MODO === "auto" && minuti > fine - 15) await avvisaAdmin(`⚠️ ${id} non pubblicato: ${contenuto.motivo}`);
    return;
  }

  registro.tentativi += 1;
  await scriviRegistro({ ...registro, stato: "in_corso" });

  const urlImmagine = `${SITO}/api/social/${tipo}/immagine?giorno=${giorno}&v=${registro.tentativi}`;
  const jpeg = await caricaImmagine(urlImmagine); // verifica + "riscalda" la cache prima di Meta

  const esiti = { ...(registro.esiti ?? {}) };
  for (const p of daFare) {
    try {
      const idPost = await pubblicaSu(p, { contenuto, jpeg, urlImmagine, giorno, tipo });
      esiti[p] = { ok: true, id: idPost, il: new Date().toISOString() };
      console.log(`${etichetta} ✓ ${p} (${idPost})`);
    } catch (err) {
      esiti[p] = { ok: false, errore: err.message, il: new Date().toISOString() };
      console.error(`${etichetta} ✗ ${p}: ${err.message}`);
    }
    // salvataggio dopo OGNI piattaforma: se il job si interrompe a metà,
    // quelle già riuscite non verranno ripubblicate
    await scriviRegistro({ ...registro, esiti, stato: "in_corso" });
  }

  const riuscite = attive.filter((p) => esiti[p]?.ok);
  const stato = riuscite.length === attive.length ? "pubblicato" : riuscite.length > 0 ? "parziale" : "errore";
  await scriviRegistro({ ...registro, esiti, stato });

  const fallite = attive.filter((p) => !esiti[p]?.ok);
  if (fallite.length > 0) {
    const ultimo = registro.tentativi >= MAX_TENTATIVI ? " (ultimo tentativo, non riproverò più oggi)" : " — riprovo tra 15 minuti";
    await avvisaAdmin(`⚠️ ${id}: errore su ${fallite.join(", ")}${ultimo}\n\n` + fallite.map((p) => `${p}: ${esiti[p].errore}`).join("\n"));
  }
}

// ---------------------------------------------------------------------

async function main() {
  if (MODO !== "anteprima" && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error("Mancano SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!["auto", "anteprima", "forza"].includes(MODO)) throw new Error(`SOCIAL_MODO non valido: ${MODO}`);

  const adesso = oraLocale();
  console.log(`Social — modo ${MODO}, ${adesso.giorno} ore ${String(Math.floor(adesso.minuti / 60)).padStart(2, "0")}:${String(adesso.minuti % 60).padStart(2, "0")} (${FUSO}), sito ${SITO}`);

  const voci = PROGRAMMA.filter((v) => !FILTRO_TIPO || v.tipo === FILTRO_TIPO);
  if (voci.length === 0) throw new Error(`Nessun post programmato di tipo "${FILTRO_TIPO}"`);

  let errori = 0;
  for (const voce of voci) {
    try {
      await eseguiVoce(voce, adesso);
    } catch (err) {
      errori++;
      console.error(`[${voce.tipo}] errore: ${err.message}`);
      await avvisaAdmin(`⚠️ Social ${voce.tipo}: ${err.message}`);
    }
  }
  if (errori === voci.length) process.exit(1);
}

main();
