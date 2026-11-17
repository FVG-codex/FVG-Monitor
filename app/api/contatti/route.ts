import { NextRequest, NextResponse } from "next/server";
import { ConfigurazioneMailMancante, inviaMessaggioContatto } from "@/lib/mailer";

// POST /api/contatti — riceve il modulo di contatto (nome/email/
// messaggio) e lo spedisce via SMTP a info@monitor.fvg.it (vedi
// lib/mailer.ts). Chiamata da components/ContattiForm.tsx via fetch(),
// stesso schema già usato da app/api/login/route.ts (non un <form> con
// submit nativo, per poter mostrare l'esito senza ricaricare la pagina).
//
// `_azienda` è un campo "honeypot": invisibile a chi usa il modulo con
// gli occhi (nascosto via CSS in ContattiForm.tsx), ma visibile a un
// bot che compila ogni campo del form senza guardarlo. Se arriva pieno,
// rispondiamo comunque "ok" (per non far capire al bot che è stato
// scoperto) ma senza inviare davvero l'email — nessuna dipendenza
// aggiuntiva, nessun servizio di CAPTCHA esterno, sufficiente per lo
// spam automatico più comune senza intralciare le persone vere.
const MAX_LUNGHEZZA = { nome: 200, email: 200, messaggio: 5000 };

function emailValida(v: string): boolean {
  // Controllo volutamente semplice (non RFC 5322 completo): qui serve
  // solo scartare refusi evidenti prima di spedire, non validare
  // un'email con precisione assoluta — la conferma vera è comunque la
  // consegna stessa.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: NextRequest) {
  let body: { nome?: unknown; email?: unknown; messaggio?: unknown; _azienda?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, errore: "richiestaNonValida" }, { status: 400 });
  }

  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const messaggio = typeof body.messaggio === "string" ? body.messaggio.trim() : "";
  const honeypot = typeof body._azienda === "string" ? body._azienda.trim() : "";

  if (honeypot) {
    // Bot: finge successo senza inviare nulla, vedi commento sopra.
    return NextResponse.json({ ok: true });
  }

  if (
    !nome ||
    !email ||
    !messaggio ||
    !emailValida(email) ||
    nome.length > MAX_LUNGHEZZA.nome ||
    email.length > MAX_LUNGHEZZA.email ||
    messaggio.length > MAX_LUNGHEZZA.messaggio
  ) {
    return NextResponse.json({ ok: false, errore: "validazione" }, { status: 400 });
  }

  try {
    await inviaMessaggioContatto({ nome, email, messaggio });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Distinzione solo nei log del server (non nella risposta al
    // visitatore, che vede sempre lo stesso messaggio generico "invio
    // non riuscito" — vedi ContattiForm.tsx) fra "SMTP non configurato
    // su Vercel" e un vero errore di invio, per non dover indovinare
    // la causa guardando solo l'effetto in produzione.
    if (err instanceof ConfigurazioneMailMancante) {
      console.error("Modulo contatti: configurazione SMTP mancante —", err.message);
    } else {
      console.error("Modulo contatti: invio email fallito —", err);
    }
    return NextResponse.json({ ok: false, errore: "invio" }, { status: 500 });
  }
}
