import nodemailer from "nodemailer";

// Modulo di contatto (24/11/2026, richiesto dall'utente: "Crea un modulo
// di contatto che spedisca a questa mail", info@monitor.fvg.it) — vedi
// app/api/contatti/route.ts per la route che usa questo file e
// components/ContattiForm.tsx per il modulo.
//
// A differenza dell'accesso con password (lib/auth.ts), qui NON esiste
// un fallback funzionante nel codice: inviare email richiede credenziali
// SMTP vere di una casella reale, non c'è un valore "di sviluppo"
// sensato da mettere come default. L'utente ha confermato di avere già
// le credenziali SMTP per info@monitor.fvg.it dal proprio provider — da
// impostare come variabili d'ambiente SOLO su Vercel (Settings →
// Environment Variables), mai committate nel repository. Vedi
// .env.example per l'elenco completo e dove trovarle di solito
// (pannello email del provider del dominio, es. Topweb).
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
// 465 = SSL/TLS diretta (quasi sempre il caso per un provider di posta
// "tradizionale"), 587 = STARTTLS. Di default `secure` segue la porta
// (true solo per 465), ma resta sovrascrivibile esplicitamente nel raro
// caso in cui il provider dell'utente si comporti diversamente.
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : SMTP_PORT === 465;

// Destinatario del modulo — fisso al valore comunicato dall'utente, ma
// sovrascrivibile senza toccare il codice se in futuro cambierà casella
// (es. per smistare temporaneamente altrove durante un cambio provider).
const DESTINATARIO = process.env.CONTATTI_EMAIL_DESTINATARIO || "info@monitor.fvg.it";

export class ConfigurazioneMailMancante extends Error {}

function creaTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new ConfigurazioneMailMancante(
      "SMTP_HOST / SMTP_USER / SMTP_PASSWORD non impostate — vedi .env.example"
    );
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

export async function inviaMessaggioContatto(params: { nome: string; email: string; messaggio: string }) {
  const { nome, email, messaggio } = params;
  const transporter = creaTransporter();

  // `from` deve corrispondere alla casella autenticata (SMTP_USER): la
  // maggior parte dei provider di posta rifiuta o marca come spam un
  // mittente diverso da quello per cui ha verificato le credenziali.
  // Il mittente del modulo (nome + email) va invece in `replyTo`, così
  // chi riceve il messaggio può semplicemente premere "Rispondi" e
  // scrivere direttamente alla persona che ha compilato il modulo,
  // invece che alla casella info@ stessa.
  await transporter.sendMail({
    from: `"FVG Monitor — modulo di contatto" <${SMTP_USER}>`,
    to: DESTINATARIO,
    replyTo: `"${nome}" <${email}>`,
    subject: `Nuovo messaggio dal modulo di contatto — ${nome}`,
    text: `Nome: ${nome}\nEmail: ${email}\n\nMessaggio:\n${messaggio}`,
    html: `
      <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Messaggio:</strong></p>
      <p>${escapeHtml(messaggio).replace(/\n/g, "<br>")}</p>
      <hr>
      <p style="color:#888;font-size:12px">Inviato dal modulo di contatto di FVG Monitor.</p>
    `,
  });
}

// Scappatoia minima per i 5 caratteri HTML rilevanti — il messaggio
// arriva da un form pubblico, va trattato come testo non fidato quando
// finisce dentro il corpo HTML dell'email (altrimenti chiunque potrebbe
// iniettare markup nell'email ricevuta dal webmaster).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
