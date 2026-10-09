// Registro di tutte le modifiche consegnate a FVG Monitor, più recente
// per prima. Pagina che lo mostra: components/ChangelogPage.tsx (/changelog),
// linkato dal footer di ogni pagina (components/Footer.tsx).
//
// Promemoria per chi lavora su questo progetto (vedi anche README.md e
// claude/fvgmonitor-stato.md): questo file va aggiornato ad OGNI modifica
// consegnata — nuovo modulo, correzione, o cambiamento visibile — con una
// voce nuova in cima, non in coda. Non serve il dettaglio tecnico completo
// (quello resta in README.md/claude/fvgmonitor-stato.md): 1-3 righe che
// descrivano cosa è cambiato per chi usa il sito, non come è stato fatto.
//
// Le voci precedenti al 22/08/2026 non hanno una data esatta registrata
// (nessun repository Git, nessuno storico consultabile) — raggruppate
// sotto "Fase iniziale" invece di inventare una data.

export type VoceChangelog = {
  data: string; // es. "25/08/2026", oppure un'etichetta tipo "Fase iniziale"
  titolo: string;
  dettagli: string[];
};

export const CHANGELOG: VoceChangelog[] = [
  {
    data: "09/10/2026",
    titolo: "Dentisti & Odontoiatri — attivata la provincia di Pordenone (29 strutture): tutte le province ora coperte",
    dettagli: [
      "Nella sezione Dentisti & Odontoiatri è ora selezionabile anche la provincia di Pordenone: 29 strutture tra ambulatori ASFO e studi privati, tutte con coordinate sulla mappa. Nel riquadro Emergenze compaiono 4 strutture con urgenze dichiarate: l'ambulatorio ASFO di Pordenone con pronto soccorso odontoiatrico, quello pediatrico di San Vito al Tagliamento, e due studi privati con reperibilità autodichiarata. Con questa attivazione tutte e quattro le province del Friuli Venezia Giulia sono ora coperte dalla sezione.",
    ],
  },
  {
    data: "09/10/2026",
    titolo: "Intestazione: emoji nel menù, titolo di sezione, selettori ridotti alla sola homepage",
    dettagli: [
      "Il menù ad amburger mostra ora un'emoji accanto a ogni voce. L'intestazione, su ogni pagina diversa dalla home, mostra anche il nome della sezione accanto a \"FVG Monitor\" (es. \"FVG Monitor – Viabilità\"). Il selettore di lingua è ora disponibile solo in homepage; il selettore di provincia (\"Tutta la regione / Trieste / Udine / Gorizia / Pordenone\") solo in homepage e nella sezione Meteo. Su schermi stretti questo riduce di molto l'altezza dell'intestazione fissa in cima alla pagina, che su alcuni telefoni Android arrivava a occupare quasi un quarto dello schermo e nascondeva l'inizio del contenuto sotto.",
    ],
  },
  {
    data: "09/10/2026",
    titolo: "Dentisti & Odontoiatri — attivata la provincia di Udine (34 strutture)",
    dettagli: [
      "Nella sezione Dentisti & Odontoiatri è ora selezionabile anche la provincia di Udine: 34 strutture tra ambulatori ASUFC e studi privati, tutte con coordinate sulla mappa. Nel riquadro Emergenze compaiono i due ambulatori pubblici ASUFC con pronto soccorso odontoiatrico (Udine e Gemona del Friuli). Per alcune strutture (12 su 34) l'orario non è ancora pubblicato: compare \"orario non pubblicato\" invece di un orario, senza che questo venga interpretato come chiusura. Resta \"in arrivo\" solo la provincia di Pordenone.",
    ],
  },
  {
    data: "09/10/2026",
    titolo: "Dentisti & Odontoiatri — nuovo riquadro Emergenze, come per Veterinari",
    dettagli: [
      "La sezione Dentisti & Odontoiatri ha ora, in cima alla pagina, lo stesso riquadro \"Emergenze\" già presente per i Veterinari: le strutture che dichiarano una disponibilità per le urgenze (al momento 6 a Gorizia, tra cui i due ambulatori pubblici ASUGI di Gorizia e Monfalcone) sono messe in evidenza con telefono diretto e nota esplicativa, e sulla mappa i loro marker sono colorati in rosso invece del teal standard. A Trieste, dove questo dato non è ancora disponibile, il riquadro resta vuoto con un messaggio che invita a contattare telefonicamente lo studio più vicino.",
    ],
  },
  {
    data: "09/10/2026",
    titolo: "Dentisti & Odontoiatri — attivata la provincia di Gorizia (34 strutture, prima mappa con coordinate vere)",
    dettagli: [
      "Nella sezione Dentisti & Odontoiatri è ora selezionabile anche la provincia di Gorizia: 34 strutture tra studi privati e i due ambulatori pubblici ASUGI (Gorizia e Monfalcone), con indirizzo, telefono, sito e orari settimanali. Prima differenza rispetto a Trieste: queste strutture hanno coordinate geografiche, quindi la mappa mostra finalmente i marker invece del solo messaggio. Le province di Udine e Pordenone restano \"in arrivo\".",
    ],
  },
  {
    data: "08/10/2026",
    titolo: "Dentisti & Odontoiatri — dati di Trieste aggiornati con la verifica dell'utente",
    dettagli: [
      "L'elenco di Trieste passa da 67 a 61 strutture: 6 escluse dopo verifica (duplicati, attività cessate, un professionista non più in attività) e 7 casi di fonti in conflitto risolti. Gli orari sono ora segnati come verificati per una parte delle strutture (in precedenza nessuna lo era). Resta da fare la georeferenziazione: nessuna struttura ha ancora coordinate, quindi la mappa continua a mostrare un messaggio invece dei soliti indicatori — comparirà da sola quando arriveranno le coordinate. Il riquadro Emergenze resta rimandato, in attesa di una fonte ASUGI aggiornata sul Pronto Soccorso Odontoiatrico.",
    ],
  },
  {
    data: "06/10/2026",
    titolo: "Sanità — nuova sezione Dentisti & Odontoiatri (provincia di Trieste)",
    dettagli: [
      "Nella pagina Sanità è apparsa la sezione Dentisti & Odontoiatri, finora \"in arrivo\": per la provincia di Trieste mostra 67 strutture (studi privati, poliambulatori e il servizio pubblico ASUGI) con indirizzo, telefono, sito, orari settimanali e indicazione se su appuntamento o convenzionato ASUGI, con ricerca ed elenco/mappa come per Veterinari. Dato iniziale fornito dall'utente e non ancora verificato, verrà sostituito con una versione verificata in una prossima fase: nessuna struttura ha ancora coordinate geografiche, quindi la mappa mostra per ora solo un messaggio invece dei soliti indicatori. A differenza di Veterinari non c'è (ancora) un riquadro Emergenze: a Trieste il pronto soccorso odontoiatrico è un servizio unico centralizzato (Ospedale Maggiore/Cattinara, gestito da ASUGI) e non una dichiarazione per singolo studio, e i suoi dettagli operativi vanno prima riverificati su una fonte ASUGI aggiornata. Le province di Udine, Gorizia e Pordenone restano \"in arrivo\".",
    ],
  },
  {
    data: "06/10/2026",
    titolo: "Meteo — tradotta anche la descrizione del cielo (\"sereno\", \"variabile\", ecc.)",
    dettagli: [
      "Nel box meteo (homepage e pagina di ogni provincia), la descrizione della copertura del cielo per domani/dopodomani (\"sereno\", \"poco nuvoloso\", \"variabile\", \"nuvoloso\", \"molto nuvoloso\", \"coperto\", \"nubi sparse\") è ora tradotta in inglese, tedesco, sloveno e croato invece di restare sempre in italiano. Un'eventuale descrizione diversa dalle 7 previste (mai osservata finora nel bollettino OSMER) continua a comparire in italiano invece di sparire.",
    ],
  },
  {
    data: "06/10/2026",
    titolo: "Multilingua — aggiunto il croato come quinta ed ultima lingua del sito",
    dettagli: [
      "Dopo italiano, inglese, tedesco e sloveno, il sito è ora disponibile anche in croato: stesso identico testo fisso già tradotto per le altre lingue, selezionabile dal nuovo pulsante \"HR\" nel selettore di lingua in alto. Come per le altre lingue, i dati che arrivano dalle fonti esterne (bollettini, notizie, orari, risultati sportivi, calendari di raccolta rifiuti, ecc.) restano in italiano anche nella versione croata, e i nomi di comuni e provincia (Trieste, Udine, Gorizia, Pordenone) e il nome della regione (\"Friuli Venezia Giulia\") restano scritti come in italiano anche in croato, per lo stesso motivo già applicato allo sloveno. Con questa si completano tutte le lingue previste dal piano originale.",
    ],
  },
  {
    data: "06/10/2026",
    titolo: "Fase 4 (rifinitura) — performance: la pagina Veterinari scarica ~27 KB in meno",
    dettagli: [
      "Terza e ultima area di \"Fase 4\" (dopo Responsive e Accessibilità): un controllo del peso delle pagine ha trovato che la sezione Veterinari & Emergenze scaricava, oltre ai propri dati, anche l'intero elenco Supermercati di tutte e 4 le province (mai usato in quella pagina) per via di un collegamento interno tra due file di libreria. Corretto: la pagina Veterinari ora scarica solo i propri dati. Nessun cambiamento visibile per chi usa il sito, solo un caricamento più leggero di quella pagina.",
    ],
  },
  {
    data: "06/10/2026",
    titolo: "Viabilità — nuovo box \"Lavori in corso\" (cantieri stradali di FVG Strade)",
    dettagli: [
      "Nella pagina Viabilità è apparso un nuovo box che mostra i cantieri stradali segnalati da FVG Strade SpA (senso unico alternato, chiusure, limitazioni di velocità) attivi nella giornata corrente, ricavati dalla pagina pubblica fvgstrade.it/infolavori. Ogni scheda mostra il titolo e il testo integrale dell'avviso originale (con le date e gli orari esatti della limitazione) e un link diretto all'articolo di FVG Strade. Il filtro \"attivi oggi\" è calcolato automaticamente leggendo le date scritte nel testo di ciascun avviso (il sito di FVG Strade non pubblica un campo data separato): un piccolo numero di avvisi che coprono un singolo giorno lavorativo all'interno di un periodo più ampio (es. \"un giorno lavorativo tra il 8/10 e il 12/11\") vengono mostrati per l'intero periodo, perché il giorno esatto non è altrimenti deducibile — il testo integrale dell'avviso lo chiarisce comunque. Titolo e testo dei cantieri restano in italiano in ogni lingua del sito, come tutti i dati da fonti esterne; solo le etichette del box sono tradotte in inglese, tedesco e sloveno.",
    ],
  },
  {
    data: "06/10/2026",
    titolo: "Multilingua — aggiunto lo sloveno come quarta lingua del sito",
    dettagli: [
      "Dopo italiano, inglese e tedesco, il sito è ora disponibile anche in sloveno: stesso identico testo fisso già tradotto per le altre lingue (titoli, descrizioni, etichette dei pannelli, messaggi) tradotto anche in sloveno per tutte le pagine, selezionabile dal nuovo pulsante \"SL\" nel selettore di lingua in alto. Come per le altre lingue, i dati che arrivano dalle fonti esterne (bollettini, notizie, orari, risultati sportivi, calendari di raccolta rifiuti, ecc.) restano in italiano anche nella versione slovena. I nomi di comuni e provincia (Trieste, Udine, Gorizia, Pordenone) e il nome della regione (\"Friuli Venezia Giulia\") restano scritti come in italiano anche in sloveno — nonostante esistano esonimi sloveni storici (Trst, Videm, Gorica) — per coerenza con i dati reali (nomi di stazioni, indirizzi, bollettini) che sono generati da componenti non consapevoli della lingua e restano sempre in italiano: usare un esonimo solo nel testo fisso avrebbe creato un'incoerenza visibile nello stesso paragrafo. Prossima ed ultima lingua prevista dal piano originale: il croato.",
    ],
  },
  {
    data: "06/10/2026",
    titolo: "Tradotti i rimanenti moduli mappa e pannelli di pagina (Autobus, Treni, Aviazione, Farmacie, Fiumi, Maree, Pazzi per il meteo, Piste ciclabili, Pronto soccorso, Radar, Supermercati, Temperatura, Terremoti, Veterinari, Colonnine, Confini, Economia, Allerte)",
    dettagli: [
      "Completata la pulizia del debito tecnico di traduzione rimasto dopo la homepage: anche i popup delle mappe (autobus, treni, aviazione, farmacie, supermercati, terremoti, veterinari, piste ciclabili, pronto soccorso) e i pannelli di pagina rimasti in italiano fisso (livello fiume, grafico marea di oggi, previsioni e aggiornamenti di \"Pazzi per il meteo\", radar meteo, badge temperatura, sintesi colonnine elettriche in homepage, sezione Confini della pagina Viabilità, disoccupazione in Economia, avviso allerta Protezione Civile) sono ora tradotti in inglese e tedesco. Corretto anche un piccolo bug di formato data/ora e numeri (fisso all'italiano invece di seguire la lingua scelta) nel grafico marea e nel pannello disoccupazione. I dati reali — nomi di fermate/stazioni/strutture, indirizzi, orari, numeri di telefono, testo dei bollettini e degli eventi di traffico — restano in italiano in ogni lingua, come tutti i dati da fonti esterne o calcolati dal sito stesso.",
    ],
  },
  {
    data: "05/10/2026",
    titolo: "Homepage — tradotti tutti i restanti pannelli (banner allerta, carburanti, eventi, notizie, sole e luna, vento, pioggia, pollini, balneazione, viabilità, voli, TGR)",
    dettagli: [
      "Completata la pulizia dei pannelli di homepage iniziata col Meteo e proseguita con Qualità aria/Fiumi/Mare/Allerte (vedi voci sotto): anche il banner delle allerte in cima alla pagina, e i pannelli carburanti, eventi, notizie, sole e luna, vento, pioggia, pollini, balneazione, viabilità, voli e il collegamento al TGR sono ora tradotti in inglese e tedesco (etichette, stati di caricamento/errore, intestazioni). Il pannello voli è condiviso con la pagina Trasporti, quindi è tradotto anche lì. I dati veri e propri (bollettini, orari, testo degli eventi di traffico, nomi di stazioni/punti di monitoraggio) restano in italiano in ogni lingua, come tutti i dati da fonti esterne.",
    ],
  },
  {
    data: "05/10/2026",
    titolo: "Homepage — tradotti anche i pannelli Qualità aria, Fiumi, Mare e Allerte",
    dettagli: [
      "Proseguendo la pulizia iniziata col pannello Meteo (vedi voce sotto): anche i pannelli di homepage/pagina provincia per qualità dell'aria, livello dei fiumi, livello del mare e zone di allerta della Protezione Civile sono ora tradotti in inglese e tedesco (etichette, stati di caricamento/errore, \"Oltre soglia\", i nomi dei livelli di allerta Verde/Gialla/Arancione/Rossa). I valori numerici e i dati delle stazioni restano quelli reali, non tradotti. Nella mappa delle colonnine elettriche, anche le etichette del popup (Operatore, Costo, Stato, verifica dati) sono ora tradotte.",
    ],
  },
  {
    data: "05/10/2026",
    titolo: "Meteo — tradotto anche il pannello riassuntivo in homepage (e il dettaglio provincia)",
    dettagli: [
      "Il pannello meteo dell'homepage e il riquadro dettagliato di ogni pagina provincia non erano mai stati tradotti (sono un componente condiviso, non una delle pagine già tradotte): ora etichette, stati di caricamento/errore, \"Dettagli\", \"Oggi\"/\"Domani\"/\"Dopodomani\", \"Ieri\", \"Aggiornamento\" sono tradotti in inglese e tedesco come il resto del sito. Il testo del bollettino OSMER stesso (es. \"poco nuvoloso\", le previsioni per zona) resta in italiano in ogni lingua, come tutti i dati da fonti esterne.",
    ],
  },
  {
    data: "05/10/2026",
    titolo: "Multilingua — aggiunto il tedesco come terza lingua del sito",
    dettagli: [
      "Dopo l'inglese (vedi voce sotto), il sito è ora disponibile anche in tedesco: stesso identico testo fisso già tradotto per l'inglese (titoli, descrizioni, etichette dei pannelli, messaggi) tradotto anche in tedesco per tutte le pagine, selezionabile dal nuovo pulsante \"DE\" nel selettore di lingua in alto. Come per l'inglese, i dati che arrivano dalle fonti esterne (bollettini, notizie, orari, risultati sportivi, calendari di raccolta rifiuti, ecc.) restano in italiano anche nella versione tedesca. Stesso criterio che verrà applicato anche alle prossime lingue (sloveno, croato).",
    ],
  },
  {
    data: "05/10/2026",
    titolo: "Multilingua — tradotto in inglese il testo fisso di tutte le pagine del sito (35 pagine)",
    dettagli: [
      "Completata la traduzione in inglese di titoli, descrizioni, etichette dei pannelli e messaggi fissi di tutte le pagine del sito (Trasporti, Economia, Registro modifiche, Commercio, Servizi, FVG in immagini, pagine provincia, Turismo, Dati ambientali, Ambiente, Sanità, Viabilità, Terremoti, Webcam, Meteo, Aviazione, Tennis, Notizie per provincia, Basket, Eventi, Neve & Impianti, Strutture ricettive (hub + le 8 pagine per tipologia), Maree, Baseball & Softball, Calcio, Supermercati, Pronto Soccorso, Farmacie (tutte + di turno), Colonnine elettriche, Veterinari & Emergenze, Sci, Piste ciclabili, Raccolta rifiuti e le pagine \"in arrivo\"), incluso l'indicatore \"Aperta ora\"/\"Chiusa ora\" condiviso da Farmacie, Supermercati e Veterinari. I dati che arrivano dalle fonti esterne (bollettini, notizie, orari, risultati sportivi, calendari di raccolta rifiuti, ecc.) restano in italiano anche nella versione inglese, come deciso insieme all'utente — tradurli è un lavoro separato, più impegnativo (richiede un'integrazione con un servizio di traduzione automatica), non ancora programmato. Lo stesso criterio (solo testo fisso delle pagine) verrà applicato anche alle future traduzioni in altre lingue (tedesco, sloveno, croato).",
    ],
  },
  {
    data: "05/10/2026",
    titolo: "Veterinari & Emergenze — correzioni dati da controllo incrociato e mappa che si centra sul comune",
    dettagli: [
      "Corretti 5 record (Gorizia, Pordenone, Udine, Trieste) dopo un controllo incrociato con fonti esterne: un'identità errata, telefoni/email/siti mancanti, orari sbagliati o incompleti, una gestione delle emergenze dichiarata in modo non accurato. Altri casi segnalati dal controllo (possibili cessazioni, incongruenze non chiarite, record senza recapito affidabile) non sono stati toccati: richiedono una verifica telefonica che non può essere fatta da qui.",
      "Selezionando una provincia o un comune dal menù, la mappa ora si centra davvero lì (prima restava ferma sul centro della provincia anche cambiando comune, per una limitazione della libreria delle mappe).",
    ],
  },
  {
    data: "05/10/2026",
    titolo: "Fix — due moduli meteo potevano fallire per un singolo intoppo di rete passeggero",
    dettagli: [
      "\"Pazzi per il meteo\" (Telegram e previsioni temporalesche) sono andati in errore in un'esecuzione reale per un problema di rete transitorio nel salvataggio su database — non un problema dei dati, che venivano letti correttamente dalla fonte. Ora, come già per il recupero dei dati dalle fonti esterne, un singolo intoppo non fa più fallire il modulo: viene ritentato automaticamente prima di arrendersi.",
    ],
  },
  {
    data: "03/10/2026",
    titolo: "Fix — la causa reale della build Vercel rotta: vecchie cartelle mai cancellate dal repository",
    dettagli: [
      "I due fix precedenti dello stesso giorno (vedi voci sotto) non bastavano perché affrontavano un problema vero ma secondario. La causa reale: la cartella app/ sul repository conteneva ancora, fianco a fianco, sia le vecchie pagine di prima del multilingua sia le nuove dentro app/[locale]/ — mai rimosse. Risolto cancellando le vecchie cartelle dal repository (non un file consegnato da questa sessione: un comando git da eseguire sul repository). Nessun impatto visibile per chi usa il sito, solo la build torna a funzionare davvero.",
    ],
  },
  {
    data: "03/10/2026",
    titolo: "Fix — la build di produzione falliva ancora su Vercel (seconda parte)",
    dettagli: [
      "Il primo fix della stessa giornata (vedi voce sotto) non bastava: un numero più piccolo ma ancora consistente di pagine continuava a far fallire la build (secondo log reale fornito dall'utente). Causa: mancava un'indicazione esplicita, a livello dell'intero sito, che dicesse a Next.js di generare TUTTE le pagine al momento della visita e mai in anticipo durante la build — ora c'è, verificata ricreando la build in isolamento prima di consegnarla. Nessun impatto visibile per chi usa il sito.",
    ],
  },
  {
    data: "03/10/2026",
    titolo: "Fix — la build di produzione falliva su Vercel dopo l'aggiunta del multilingua",
    dettagli: [
      "Il giorno stesso della consegna della Fase 1 multilingua, la build su Vercel falliva su ogni pagina del sito (log reale fornito dall'utente). Causa: una funzione aggiunta per velocizzare la generazione delle pagine in inglese/italiano, che però non va d'accordo con un sito come questo dove ogni pagina mostra dati in tempo reale — rimossa, le pagine tornano a essere generate al momento della visita come sono sempre state. Nessun impatto visibile per chi usa il sito, solo la build torna a funzionare.",
    ],
  },
  {
    data: "03/10/2026",
    titolo: "Fase 1 multilingua: il sito è ora disponibile anche in inglese",
    dettagli: [
      "In alto a destra è comparso un selettore IT/EN. L'italiano resta l'indirizzo di sempre (es. /maree), l'inglese aggiunge un prefisso (es. /en/maree). Se il browser è configurato in una lingua diversa dall'italiano, il sito ti porta automaticamente sulla versione inglese al primo accesso.",
      "In questa prima fase è tradotta solo l'interfaccia del sito: intestazione, menu, piè di pagina e il guscio della homepage (titoli dei riquadri). Il contenuto che arriva da fonti esterne — notizie, bollettini meteo, eventi, dati di traffico, ecc. — resta in italiano anche nelle pagine raggiunte con /en, perché tradurre automaticamente dati che cambiano in tempo reale non sarebbe affidabile. Le prossime lingue (tedesco, sloveno, croato) seguiranno una alla volta, così come la traduzione delle singole pagine di contenuto.",
    ],
  },
  {
    data: "03/10/2026",
    titolo: "Fix — Colonnine elettriche non si popolava nonostante la chiave impostata",
    dettagli: [
      "Il workflow di ingestione non passava la chiave OpenChargeMap allo script, anche se il secret esisteva nel repository — ogni variabile d'ambiente va dichiarata esplicitamente nel file del workflow, non basta che il secret sia salvato su GitHub. Corretto: ora il modulo riceve la chiave e può aggiornare i dati.",
    ],
  },
  {
    data: "03/10/2026",
    titolo: "Colonnine elettriche: spostata da Trasporti a Viabilità",
    dettagli: [
      "Il riquadro di accesso alla mappa delle colonnine elettriche ora si trova nella sezione Viabilità invece che in Trasporti. La pagina della mappa resta la stessa (/colonnine-elettriche), cambia solo da dove la raggiungi.",
    ],
  },
  {
    data: "03/10/2026",
    titolo: "Nuova pagina: Colonnine elettriche",
    dettagli: [
      "Nuova pagina /colonnine-elettriche (raggiungibile da Trasporti), con la mappa di tutte le colonnine di ricarica per veicoli elettrici censite in Friuli Venezia Giulia (fonte: OpenChargeMap, registro comunitario). Un pulsante usa la tua posizione, oppure puoi cercare manualmente un comune o un indirizzo, per vedere solo le colonnine entro un raggio scelto (10/30/50/100 km), ordinate per distanza.",
      "Il dato è comunitario e non garantito aggiornato per le installazioni più recenti: ogni colonnina mostra la propria data di verifica, invece di dare un'impressione di completezza non verificata.",
    ],
  },
  {
    data: "02/10/2026",
    titolo: "Maree: grafico \"Andamento di oggi\" con le 3 stazioni",
    dettagli: [
      "Su /maree, un grafico mostra ora l'andamento del livello del mare dell'intera giornata per Trieste, Grado e Lignano insieme: tratto continuo per i dati realmente osservati finora, tratteggiato per la previsione del resto della giornata. Passando il mouse (o il dito) sul grafico compare un riquadro con l'orario e il valore di ciascuna stazione in quel momento.",
    ],
  },
  {
    data: "02/10/2026",
    titolo: "Nuova pagina Maree: alta e bassa marea osservata e prevista a Trieste, Grado e Lignano",
    dettagli: [
      "Nuova pagina /maree (raggiungibile da Ambiente), con due informazioni distinte per ciascuna delle 3 stazioni costiere: i picchi di alta/bassa marea realmente registrati oggi (fonte: la stessa API Protezione Civile FVG già usata per il livello mare in tempo reale, un endpoint storico scoperto in fase di sviluppo) e la previsione per i prossimi giorni (fonte: tide-forecast.com, sito non ufficiale ma con dati strutturati verificati per tutte e 3 le località).",
      "Le due informazioni sono mostrate in due blocchi separati — 'Oggi (osservato)' e 'Prossimi giorni (previsione)' — per non confondere un dato ufficiale già misurato con una previsione di una fonte commerciale terza.",
    ],
  },
  {
    data: "30/09/2026",
    titolo: "Raccolta differenziata: GEA, altri 11 comuni — copertura completa della provincia di Pordenone",
    dettagli: [
      "La tab Pordenone di /rifiuti copre ora anche Tramonti di Sopra, Tramonti di Sotto, Vito d'Asio, Vivaro, Maniago (2 zone), Meduno, Sequals, Montereale Valcellina (2 zone), Prata di Pordenone, Roveredo in Piano e San Quirino, oltre ai 13 comuni già presenti. Calendario trascritto giorno per giorno dai PDF ufficiali GEA 2026, con doppia verifica (rilettura ad alta risoluzione e, dove utile, generazione programmatica del calendario dalla regola settimanale/quindicinale verificata più le eccezioni festive) prima della pubblicazione.",
      "A Vito d'Asio non esiste ancora un centro di raccolta fisso (solo un Ecocentro Mobile annunciato ma non attivo): spiegato in una nota sulla pagina invece di inventare un indirizzo. A Montereale Valcellina, Prata di Pordenone, Roveredo in Piano e San Quirino il calendario copre solo le frazioni effettivamente porta a porta (secco, e dove presenti carta/plastica); umido, vetro, sfalci e altri servizi non a calendario sono spiegati in una nota, sullo stesso modello già usato per Cordenons.",
      "Aggiunta anche una nota informativa alla pagina di Pordenone città (analoga a quella di Cordenons) su umido, vetro, sfalci e cartone per le attività commerciali, servizi non ancora coperti dal calendario strutturato. Con questo aggiornamento la copertura GEA per la provincia di Pordenone comprende 24 comuni.",
    ],
  },
  {
    data: "30/09/2026",
    titolo: "Raccolta differenziata: GEA, aggiunto Cordenons (tredicesimo comune)",
    dettagli: [
      "La tab Pordenone di /rifiuti copre ora anche Cordenons, con due zone (Zona 1 e Zona 2): calendario quindicinale di secco, carta e plastica. Umido e vetro a Cordenons non seguono un calendario (bidoni stradali sempre disponibili con chiave) e sono spiegati in una nuova nota informativa sulla pagina; la raccolta di sfalci e ramaglie e il servizio cartone per le attività commerciali non sono ancora coperti.",
    ],
  },
  {
    data: "30/09/2026",
    titolo: "Raccolta differenziata: GEA, altri 7 comuni (Claut, Clauzetto, Erto e Casso, Fanna, Frisanco, Caneva, Cimolais)",
    dettagli: [
      "La tab Pordenone di /rifiuti copre ora anche questi 7 comuni, oltre ad Aviano, Pordenone, Budoia, Andreis e Barcis. Calendario trascritto giorno per giorno dai PDF ufficiali GEA 2026, come per gli altri comuni di questo gestore. Caneva ha due zone dove alternano secco, carta, plastica e vetro (solo l'umido è comune a tutto il paese) — un dato di una prima trascrizione è stato ricontrollato e corretto su 4 date prima della pubblicazione.",
      "Restano fuori da questo aggiornamento Cordenons (calendario a quindicine con zone diverse da tutti gli altri comuni, in valutazione) e l'ecocentro mobile di Pordenone città (servizio diverso dal porta a porta).",
    ],
  },
  {
    data: "30/09/2026",
    titolo: "Raccolta differenziata: GEA, estensione a Budoia, Andreis e Barcis",
    dettagli: [
      "La tab Pordenone di /rifiuti copre ora anche Budoia (2 zone), Andreis e Barcis, oltre ad Aviano e Pordenone. Stesso metodo dei comuni GEA già presenti: calendario trascritto giorno per giorno dai PDF ufficiali, non una regola approssimata.",
    ],
  },
  {
    data: "18/09/2026",
    titolo: "Raccolta differenziata: calendario porta a porta di Trieste per indirizzo",
    dettagli: [
      "Nella scheda di Trieste città su /rifiuti si può ora cercare la propria via e civico per vedere il calendario dei prossimi 30 giorni (cosa viene ritirato e in che orario). A differenza del resto della pagina è una ricerca dal vivo, non un dato aggiornato una volta al giorno — Trieste è troppo grande per un calendario per area come i comuni più piccoli.",
    ],
  },
  {
    data: "18/09/2026",
    titolo: "Raccolta differenziata: aggiunto un quarto gestore (AcegasApsAmga, Trieste città)",
    dettagli: [
      "La tab Trieste di /rifiuti mostra ora anche il comune di Trieste città (fonte: AcegasApsAmga/Il Rifiutologo), finora coperta solo per i comuni minori (Isontina Ambiente): elenco dei punti di raccolta fissi (stazioni ecologiche, con indirizzo, orari e materiali conferibili). La ricerca \"dove lo butto\" per singolo oggetto, disponibile sul sito originale, non è ancora inclusa.",
    ],
  },
  {
    data: "18/09/2026",
    titolo: "Raccolta differenziata: corretti Monfalcone e Grado (mostravano una sola zona)",
    dettagli: [
      "Bug corretto: Monfalcone (4 zone: Nord/Est/Sud/Ovest) e Grado (2 zone: Fossalon Boscat/Cavarera) mostravano una sola zona invece delle reali, per un difetto nel modo in cui il sito leggeva l'elenco delle vie. Ora il selettore Area su questi due comuni mostra tutte le zone corrette.",
    ],
  },
  {
    data: "18/09/2026",
    titolo: "Raccolta differenziata: aggiunta la provincia di Pordenone (GEA)",
    dettagli: [
      "La tab Pordenone di /rifiuti mostra ora dati reali (GEA) invece di \"in arrivo\": per ora solo Aviano (2 zone) e il comune di Pordenone stesso (6 zone: Blu, Gialla, Rossa, Marrone, Verde Nord, Verde Sud), non tutta la provincia. A differenza degli altri due gestori il calendario è trascritto a mano da PDF ufficiali (giorno per giorno, non una regola approssimata) e andrà aggiornato manualmente quando GEA pubblicherà il calendario dell'anno successivo.",
    ],
  },
  {
    data: "18/09/2026",
    titolo: "Raccolta differenziata: aggiunto un secondo gestore (A&T 2000, Udine)",
    dettagli: [
      "La tab Udine di /rifiuti mostra ora dati reali (A&T 2000) invece di \"in arrivo\": per ora solo San Daniele del Friuli e Tolmezzo (quest'ultimo con calendario diviso in Zona Nord/Sud), non tutta la provincia. Aggiunto anche il vetro come tipo di rifiuto separato (raccolto porta a porta da questo gestore, a differenza di Isontina).",
    ],
  },
  {
    data: "18/09/2026",
    titolo: "Raccolta differenziata: ora divisa per provincia",
    dettagli: [
      "La pagina /rifiuti ha ora delle tab per provincia (Trieste, Udine, Gorizia, Pordenone) invece di un unico elenco comuni. Per ora sono coperte solo Gorizia e Trieste (Isontina Ambiente); le altre due mostrano \"in arrivo\" in attesa di un secondo gestore.",
    ],
  },
  {
    data: "17/09/2026",
    titolo: "Ambiente: nuova sezione Servizi, si parte con la Raccolta differenziata",
    dettagli: [
      "Nuova sezione /servizi dentro Ambiente. Prima voce: calendario della raccolta differenziata per 28 comuni dell'Isontino/Carso (fonte: Isontina Ambiente), con centro di raccolta e campane del vetro. Aggiornato una volta al giorno.",
    ],
  },
  {
    data: "17/09/2026",
    titolo: "Turismo: nuova pagina dedicata Eventi",
    dettagli: [
      "Nuova sezione /eventi dentro Turismo, con tab Oggi/Domani/Weekend/Prossimi 14 giorni, immagini, orario, categoria e filtro per categoria. Il pannello Eventi in homepage ora rimanda alla pagina completa.",
    ],
  },
  {
    data: "17/09/2026",
    titolo: "Calcio: aggiunta la Terza Categoria (4 gironi)",
    dettagli: [
      "Nuovi gironi selezionabili nella pagina Calcio: Terza Categoria Girone D, A, B e C, con calendario e classifica come per le altre categorie già presenti (Eccellenza, Promozione, Prima e Seconda Categoria).",
    ],
  },
  {
    data: "16/09/2026",
    titolo: "Viabilità: Confini, eventi live anche lato sloveno (sperimentale)",
    dettagli: [
      "Per 4 valichi verso la Slovenia (Fernetti, Rabuiese/Škofije, Sant'Andrea/Vrtojba, Pesek/Kozina) la sezione Confini mostra ora anche gli eventi di traffico reali del lato sloveno (fonte: Promet.si), oltre a quelli già disponibili lato italiano per i 2 valichi autostradali.",
    ],
  },
  {
    data: "16/09/2026",
    titolo: "Viabilità: nuova sezione Confini",
    dettagli: [
      "Aggiunta una sezione Confini alla pagina Viabilità: i 15 valichi/direttrici verso Slovenia e Austria con comune, strada e tipologia; per i 2 valichi autostradali (A23 Tarvisio, A34 Sant'Andrea/Vrtojba) anche gli eventi di traffico in tempo reale già disponibili sul sito.",
    ],
  },
  {
    data: "16/09/2026",
    titolo: "Turismo: nuova pagina Neve & Impianti",
    dettagli: [
      "Nuova voce Turismo → Neve & Impianti: stato degli impianti, neve in pista, piste e tappeti aperti, per tutti e 7 i poli sciistici della regione (Tarvisio, Sella Nevea, Zoncolan, Piancavallo, Forni di Sopra, Sappada/Forni Avoltri, Sauris), con link a pagina ufficiale e webcam per ciascuno.",
    ],
  },
  {
    data: "16/09/2026",
    titolo: "Sanità: nuova pagina Pronto Soccorso in tempo reale",
    dettagli: [
      "Nuova voce Sanità → Pronto Soccorso: pazienti in attesa e in trattamento per codice di triage, aggiornati ogni 15 minuti, per tutte le sedi della regione — con indirizzo, telefono (quando disponibile), mappa e indicazioni stradali.",
    ],
  },
  {
    data: "15/09/2026",
    titolo: "Veterinari & Emergenze: aggiunta la provincia di Udine",
    dettagli: [
      "La pagina Veterinari & Emergenze (dentro Sanità) mostra ora anche le 40 strutture della provincia di Udine, con lo stesso riquadro Emergenze in evidenza già disponibile per le altre province. Con questa aggiunta la pagina copre tutte e 4 le province del FVG.",
    ],
  },
  {
    data: "13/09/2026",
    titolo: "Veterinari & Emergenze: corretta la lista di Pordenone",
    dettagli: [
      "Tre strutture risultate chiuse o con l'attività non confermata sono state rimosse dall'elenco della provincia di Pordenone; per altre due sono state verificate meglio le fonti degli orari.",
    ],
  },
  {
    data: "13/09/2026",
    titolo: "Veterinari & Emergenze: aggiunta la provincia di Pordenone",
    dettagli: [
      "La pagina Veterinari & Emergenze (dentro Sanità) mostra ora anche le 33 strutture della provincia di Pordenone, con lo stesso riquadro Emergenze in evidenza già disponibile per Trieste e Gorizia.",
    ],
  },
  {
    data: "13/09/2026",
    titolo: "Veterinari & Emergenze: corretta la lista di Gorizia",
    dettagli: [
      "Una struttura risultata trasferita fuori provincia è stata rimossa e una nuova è stata aggiunta a Cormons; per un'altra struttura sono stati corretti nome, orari e contatti sulla base della fonte ufficiale.",
    ],
  },
  {
    data: "13/09/2026",
    titolo: "Veterinari & Emergenze: aggiunta la provincia di Gorizia",
    dettagli: [
      "La pagina Veterinari & Emergenze (dentro Sanità) mostra ora anche le 16 strutture della provincia di Gorizia, con lo stesso riquadro Emergenze in evidenza già disponibile per Trieste.",
    ],
  },
  {
    data: "13/09/2026",
    titolo: "Supermercati: verifica completa della provincia di Udine",
    dettagli: [
      "Aggiornata con una revisione più ampia la lista dei supermercati di Udine: tutti i 145 punti vendita hanno ora coordinate sulla mappa (prima 22 ne erano privi) e la quasi totalità ha l'orario verificato.",
      "Aggiunti Aldi Manzano ed Eurospin a San Giorgio di Nogaro e San Giovanni al Natisone; rimossa una voce risultata non essere un supermercato.",
    ],
  },
  {
    data: "11/09/2026",
    titolo: "Supermercati: corretta la lista ALDI di Udine",
    dettagli: [
      "Cinque punti vendita ALDI senza riscontro ufficiale sono stati rimossi dalla provincia di Udine, quattro nuovi verificati sono stati aggiunti (Bagnaria Arsa, Martignacco, Reana del Rojale, Udine Tricesimo) e tre indirizzi esistenti sono stati corretti.",
      "Risolto anche un errore che poteva bloccare la pagina Supermercati sulla provincia di Udine: i punti vendita senza orario pubblicato ora mostrano \"Orario non disponibile\" invece di causare un errore.",
    ],
  },
  {
    data: "11/09/2026",
    titolo: "Corretto l'ordine delle partite in Baseball & Softball",
    dettagli: [
      "Nella pagina Baseball & Softball (dentro Sport) le partite erano ordinate dalla data più lontana a quella più vicina: ora vengono mostrate a partire da quelle più vicine a oggi, come nel calendario ufficiale.",
    ],
  },
  {
    data: "11/09/2026",
    titolo: "Riorganizzazione del menù: Ambiente, Turismo e FVG in immagini",
    dettagli: [
      "Nel menù sono comparse tre nuove sezioni che raggruppano voci già esistenti: \"Ambiente\" (Dati ambientali per provincia + Terremoti), \"Turismo\" (Strutture ricettive + Piste ciclabili) e \"FVG in immagini\" (Webcam regionali, con una Galleria fotografica in arrivo).",
      "La pagina Notizie ha ora anche una scheda \"Sport\", accanto alle 4 province, in attesa delle prime notizie sportive.",
      "\"Dati ambientali\" è una pagina nuova: gli stessi dati di vento, pioggia, aria, pollini, mare, fiumi e balneazione già visibili in homepage, ma selezionabili una provincia alla volta — la sezione Ambiente della homepage resta invariata.",
    ],
  },
  {
    data: "11/09/2026",
    titolo: "Nuova sezione \"Sanità\": Veterinari & Emergenze",
    dettagli: [
      "Nel menù, \"Farmacie\" è confluita in una nuova voce \"Sanità\", insieme a due sezioni in arrivo (Cliniche & centri medici, Dentisti & Odontoiatri) e alla nuova sezione \"Veterinari & Emergenze\" (provincia di Trieste): un riquadro dedicato mostra subito le strutture con un servizio di emergenza dichiarato, con numero di telefono in evidenza.",
    ],
  },
  {
    data: "11/09/2026",
    titolo: "Supermercati: aggiornata la lista di Udine",
    dettagli: [
      "La provincia di Udine è passata da 107 a 144 punti vendita, con mappa ora visibile per la quasi totalità degli indirizzi (prima erano tutti senza coordinate).",
    ],
  },
  {
    data: "10/09/2026",
    titolo: "Nuova sezione \"Commercio\": Supermercati delle 4 province",
    dettagli: [
      "Nel menù è comparsa la sezione \"Commercio\", con \"Supermercati\" come prima categoria: oltre 300 punti vendita (supermercati, ipermercati e discount) suddivisi per provincia e comune, con indirizzo, telefono, orari di oggi e mappa.",
    ],
  },
  {
    data: "10/09/2026",
    titolo: "Nuova sezione \"Economia\": tasso di disoccupazione trimestrale del FVG",
    dettagli: [
      "Prima sezione dedicata all'economia regionale, raggiungibile dal menu: l'ultimo tasso di disoccupazione trimestrale (fonte ISTAT), con variazione sul trimestre precedente e lo storico degli ultimi 2 anni.",
    ],
  },
  {
    data: "09/09/2026",
    titolo: "Meteo: link diretto all'articolo completo su ogni previsione temporalesca",
    dettagli: [
      "Nel riquadro \"Previsioni temporalesche\" della pagina Meteo, ogni voce ha ora un link \"Leggi la previsione completa su PMG →\" accanto ad autore e data.",
    ],
  },
  {
    data: "09/09/2026",
    titolo: "Meteo: due nuovi riquadri con gli aggiornamenti di \"Pazzi per il meteo Goriziano\"",
    dettagli: [
      "Nella pagina Meteo (vista \"Tutta la regione\") sono comparsi due nuovi riquadri: gli ultimi aggiornamenti dal canale Telegram del meteorologo, e gli articoli \"Previsioni temporalesche\" dal suo sito.",
    ],
  },
  {
    data: "09/09/2026",
    titolo: "Autobus: ogni fermata linka ora la pagina in tempo reale ufficiale TPL FVG",
    dettagli: [
      "Nella sezione Trasporti → Autobus, il nome di ogni fermata (sotto ai passaggi e nell'elenco fermate del blocco) è ora un link diretto alla pagina in tempo reale di TPL FVG per quella fermata specifica.",
    ],
  },
  {
    data: "09/09/2026",
    titolo: "Meteo: aggiunta la previsione di oggi, con evidenza automatica degli aggiornamenti infragiornalieri",
    dettagli: [
      "Il pannello Meteo ora mostra anche la previsione di \"Oggi\" (prima mancava, comparivano solo domani e dopodomani) e, quando OSMER rivede il bollettino della mattina nel corso della giornata, il testo dell'aggiornamento compare in evidenza sia in homepage sia nella pagina di dettaglio provincia.",
    ],
  },
  {
    data: "08/09/2026",
    titolo: "Notizie: aggiunta Pordenone, completando tutte e 4 le province",
    dettagli: [
      "La sezione Notizie ora copre anche Pordenone (PordenoneToday.it, PordenoneOggi.it, RaiNews TGR FVG, Telefriuli) — Trieste, Udine, Gorizia e Pordenone sono ora tutte attive.",
    ],
  },
  {
    data: "06/09/2026",
    titolo: "Farmacie: chiarito l'orario dei turni a cavallo di mezzanotte",
    dettagli: [
      "Un turno che inizia oggi e finisce domani mattina ora è scritto per esteso (\"da oggi 00:00 a domani 08:30\") invece della sigla \"(giorno succ.)\", per non sembrare in contraddizione col badge \"Aperta ora\".",
    ],
  },
  {
    data: "06/09/2026",
    titolo: "Meteo: emoji per la copertura del cielo in homepage",
    dettagli: [
      "Il pannello Meteo di homepage mostra ora un'emoji (☀️ 🌤️ ⛅ 🌦️) accanto alla descrizione del cielo di ciascuna provincia.",
    ],
  },
  {
    data: "06/09/2026",
    titolo: "Sole e luna: aggiunti sorgere e tramontare della Luna",
    dettagli: [
      "Il pannello \"Sole e luna\" mostra ora anche l'orario di sorgere e tramontare della Luna, sotto la fase lunare.",
      "Alcuni giorni la Luna non sorge o non tramonta (capita circa una volta al mese): in quel caso viene mostrato \"non oggi\" invece di un orario inventato.",
    ],
  },
  {
    data: "06/09/2026",
    titolo: "Notizie Gorizia: aggiunta La Gazzetta di Gorizia",
    dettagli: [
      "Aggiunta anche La Gazzetta di Gorizia alle notizie di Gorizia — tutte e 4 le fonti previste sono ora attive.",
    ],
  },
  {
    data: "06/09/2026",
    titolo: "Notizie Gorizia: aggiunto Il Goriziano",
    dettagli: [
      "Aggiunta anche la fonte Il Goriziano alle notizie di Gorizia (3 fonti su 4 ora attive). Resta da aggiungere La Gazzetta di Gorizia.",
    ],
  },
  {
    data: "06/09/2026",
    titolo: "Notizie: aggiunta la provincia di Gorizia",
    dettagli: [
      "La sezione Notizie ora copre anche Gorizia, con GORIZIA.news e RaiNews TGR FVG. Il Goriziano e La Gazzetta di Gorizia si aggiungeranno appena verificate.",
    ],
  },
  {
    data: "06/09/2026",
    titolo: "Notizie: aggiunta la provincia di Udine",
    dettagli: [
      "La sezione Notizie ora copre anche Udine, con 5 fonti: UdineToday.it, UDINE.news, Telefriuli, PrimaUdine.it e RaiNews TGR FVG. Gorizia e Pordenone seguiranno in futuro.",
    ],
  },
  {
    data: "06/09/2026",
    titolo: "Notizie: risolta davvero l'assenza di RaiNews TGR FVG dal flusso",
    dettagli: [
      "Il fix del 05/09 non bastava: la pagina usata per leggere le notizie RaiNews risultava vuota a un fetch automatico (il contenuto viene aggiunto dal sito solo dopo via JavaScript). Corretto collegandosi direttamente al servizio dati usato dal sito stesso, molto più affidabile dello scraping della pagina.",
    ],
  },
  {
    data: "05/09/2026",
    titolo: "Notizie: corretta l'assenza di RaiNews TGR FVG dal flusso",
    dettagli: [
      "Le notizie di RaiNews TGR FVG (provincia di Trieste) non comparivano mai. Corretto: mancava la gestione di un formato di data usato dal sito per le notizie di oggi, che le faceva scartare tutte per errore.",
    ],
  },
  {
    data: "05/09/2026",
    titolo: "Notizie: corretto un errore nei titoli (virgolette/apostrofi mostrati come codice)",
    dettagli: [
      "Alcuni titoli in \"Notizie\" (es. da Trieste All News) mostravano codici come \"&#8216;\" invece delle virgolette o dell'apostrofo. Corretto: ora vengono mostrati correttamente.",
    ],
  },
  {
    data: "05/09/2026",
    titolo: "Notizie: aggiunta la terza fonte per Trieste (TriestePrima.it)",
    dettagli: [
      "Nella sezione \"Notizie\" (provincia di Trieste) sono comparse anche le notizie di TriestePrima.it, oltre a Trieste All News e RaiNews TGR FVG.",
      "Resta da sbloccare solo TriesteCafe.it per completare le 4 fonti richieste.",
    ],
  },
  {
    data: "05/09/2026",
    titolo: "Google Analytics",
    dettagli: [
      "Aggiunto il tracciamento con Google Analytics, per capire meglio come viene usato il sito.",
    ],
  },
  {
    data: "05/09/2026",
    titolo: "Nuova sezione \"Notizie\" nel menu, per ora su Trieste",
    dettagli: [
      "Nel menu ☰ è comparsa una nuova voce \"Notizie\", con notizie locali divise per provincia (diverse dall'ANSA regionale, che resta invariata in homepage).",
      "Per ora è attiva solo Trieste, con le notizie di Trieste All News e di RaiNews TGR FVG. Le altre due fonti richieste (TriestePrima.it, TriesteCafe.it) non hanno ancora un feed accessibile da qui — verranno aggiunte appena disponibili dei dati di esempio.",
      "Udine, Gorizia e Pordenone arriveranno in un secondo momento.",
    ],
  },
  {
    data: "04/09/2026",
    titolo: "Nuova sezione \"Ambiente\" in homepage, e orari di sole e luna",
    dettagli: [
      "In homepage, i dati su vento e pioggia (Bora), qualità dell'aria, pollini, livelli di mare e fiumi e qualità delle acque di balneazione sono ora raggruppati sotto una nuova sezione \"Ambiente\", più facile da individuare a colpo d'occhio.",
      "Vento e pioggia restano anche nella sezione Meteo, come prima.",
      "Nuovo pannello \"Sole e luna\" — in homepage e in Meteo — con albeggio, alba, tramonto, crepuscolo e fase lunare del giorno, calcolati al volo senza bisogno di una fonte esterna.",
    ],
  },
  {
    data: "04/09/2026",
    titolo: "Nuovo tema chiaro, da attivare su richiesta",
    dettagli: [
      "In alto a destra, accanto all'orologio, un nuovo pulsante (icona sole/luna) permette di passare dal tema scuro abituale a un tema chiaro — e viceversa.",
      "Il sito resta scuro di default per tutti: il tema chiaro va scelto a mano, e da quel momento viene ricordato sul tuo browser per le visite successive.",
    ],
  },
  {
    data: "31/08/2026",
    titolo: "Calcio — aggiornata la stagione 2026/27, con archivio della stagione precedente",
    dettagli: [
      "Su /calcio i 9 campionati regionali mostrano ora di default il calendario e la classifica della nuova stagione 2026/27 (appena iniziata, tutte le squadre a 0 partite giocate).",
      "In fondo alla pagina un nuovo pulsante \"Stagione\" permette di rivedere l'archivio della stagione 2025/26 appena conclusa.",
    ],
  },
  {
    data: "28/08/2026",
    titolo: "Piste Ciclabili — aggiunta una sesta fonte, il dataset storico Ciclovie 2020",
    dettagli: [
      "Nuovo riquadro \"Ciclovie 2020 · storico\" su /piste-ciclabili: copertura regionale completa (Trieste inclusa) ma dato fermo al gennaio 2020, mostrato come contesto storico e non come stato attuale della rete.",
      "Per ogni percorso viene mostrata la lunghezza per stato (realizzato, in progetto, pianificato, ecc.) quando un percorso ha tratti in stati diversi.",
    ],
  },
  {
    data: "28/08/2026",
    titolo: "Strutture ricettive — corretto un \"Sito\" che in realtà era un'email (categoria Marina)",
    dettagli: [
      "Alcune schede della categoria Dry Marina e Marina Resort mostravano \"Sito →\" seguito da un indirizzo email invece che da un sito vero — corretto alla fonte, le schede già mostrate verranno ri-scaricate automaticamente nelle prossime esecuzioni.",
    ],
  },
  {
    data: "28/08/2026",
    titolo: "Strutture ricettive — contatti arricchiti da turismofvg.it per altre 7 categorie",
    dettagli: [
      "L'arricchimento contatti già attivo per gli Agriturismi (indirizzo, telefono, sito, CIN da turismofvg.it invece che da OpenStreetMap quando disponibile) ora copre anche B&B, Affittacamere, Campeggi e Villaggi Turistici, Alberghi Diffusi, Strutture a carattere Sociale, Dry Marina e Marina Resort, Rifugi.",
      "La copertura si costruisce gradualmente nelle prossime ore/giorni (le nuove categorie hanno un elenco molto più grande da scaricare a piccoli passi) — non aspettatevi tutte le schede arricchite da subito.",
    ],
  },
  {
    data: "28/08/2026",
    titolo: "Homepage — riga Meteo per provincia più leggibile su telefono",
    dettagli: [
      "Corretto un problema di impaginazione sul pannello \"Meteo · Le 4 province\" in homepage: su schermi stretti la riga di ogni provincia poteva andare a capo in modo disordinato con il link \"Dettagli\" schiacciato sul bordo.",
    ],
  },
  {
    data: "28/08/2026",
    titolo: "Piste ciclabili — tutte le serie turismofvg.it, un riquadro per fonte",
    dettagli: [
      "Oltre agli anelli, ora sono mostrati anche i percorsi lineari, le ciclovie a tappe e i percorsi mountain bike di turismofvg.it, ciascuno con lunghezza, dislivelli, difficoltà, durata, comuni attraversati e link per scaricare il file GPX.",
      "La pagina Piste ciclabili ha ora un riquadro separato per ciascuna delle 5 fonti (le 4 serie turismofvg.it più i dati della Regione FVG, mostrati per ultimi), invece di un unico elenco condiviso — più facile distinguerle a colpo d'occhio, anche sulla mappa dove ogni fonte ha ora il proprio colore.",
    ],
  },
  {
    data: "28/08/2026",
    titolo: "Piste ciclabili — aggiunta la fonte turismofvg.it (percorsi ad anello)",
    dettagli: [
      "Nella stessa pagina Piste ciclabili sono ora mostrati anche i percorsi ad anello ufficiali di turismofvg.it (codici \"R0XX\"), con lunghezza, dislivelli, difficoltà, durata, comuni attraversati e link per scaricare il file GPX — accanto ai dati Regione, non uniti ad essi. Al momento solo la serie \"anelli\", le altre serie del sito potranno seguire.",
    ],
  },
  {
    data: "27/08/2026",
    titolo: "Piste ciclabili — comune, provincia e click per evidenziare",
    dettagli: [
      "Ogni percorso mostra ora (quando disponibile) il comune di partenza/arrivo e la provincia. Cliccando il nome di un percorso nell'elenco, ora viene evidenziato e mostrato ingrandito sulla mappa.",
    ],
  },
  {
    data: "27/08/2026",
    titolo: "Piste ciclabili — nuova sezione",
    dettagli: [
      "Aggiunta la sezione Piste ciclabili (/piste-ciclabili): mappa ed elenco dei percorsi ciclabili trasmessi dai Comuni alla Regione, fonte Regione FVG. Copertura parziale, non l'intera rete regionale — dichiarato in pagina.",
    ],
  },
  {
    data: "27/08/2026",
    titolo: "Farmacie — corretto il pallino \"Chiusa ora\" mostrato per errore",
    dettagli: [
      "In alcuni casi (dati non ancora aggiornati per la giornata) una farmacia poteva risultare \"Chiusa ora\" anche durante il proprio orario di apertura. Ora, quando i dati non sono ancora affidabili per oggi, non viene mostrato alcun pallino invece di uno stato sbagliato.",
    ],
  },
  {
    data: "27/08/2026",
    titolo: "Corretto un problema per cui la mappa copriva il menù",
    dettagli: [
      "Su alcune pagine con mappa (es. Farmacie), aprendo il menù di navigazione la mappa poteva comparirci sopra invece che sotto. Corretto su tutte le pagine con mappa; nella pagina Farmacie l'elenco ora compare anche prima della mappa.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Ingestione — corretto un possibile blocco delle esecuzioni programmate",
    dettagli: [
      "Nessun cambiamento visibile sul sito: un'esecuzione programmata era rimasta bloccata su GitHub (in parte per un disservizio della piattaforma, verificato su githubstatus.com). Aggiunti timeout più stretti e una regola che cancella un'esecuzione ancora in corso quando ne parte una nuova, per evitare che si accumulino in futuro.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Farmacie — filtro per comune dentro ogni provincia",
    dettagli: [
      "Dopo aver scelto una provincia, compare ora un secondo gruppo di tastini (stessa grafica di quelli provincia) con tutti i comuni di quella provincia, per filtrare l'elenco e la mappa a un solo comune.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Farmacie — indicatore \"Aperta ora\" / \"Chiusa ora\"",
    dettagli: [
      "Ogni farmacia mostra ora un pallino verde/rosso con l'etichetta \"Aperta ora\" o \"Chiusa ora\", calcolato in base all'orario di oggi — sia nell'elenco che nella mappa.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Farmacie — corretto un bug che azzerava tutte le pagine",
    dettagli: [
      "Nessuna farmacia compariva in nessuna provincia (bug segnalato dall'utente): un errore nel calcolo della provincia scartava ogni riga del dataset. Corretto — ora tutte le farmacie compaiono correttamente.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Farmacie — divisa in \"Tutte le farmacie\" e \"Farmacie di turno\"",
    dettagli: [
      "La voce \"Farmacie\" nel menù apre ora un hub con due sezioni, come per Sport e Strutture ricettive: \"Tutte le farmacie\" (elenco completo con orari di oggi e contatti) e \"Farmacie di turno\" (solo le aperture straordinarie di oggi, come prima).",
      "Aggiunta la ricerca per nome o comune su entrambe le pagine.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Agriturismi — contatti più completi da turismofvg.it",
    dettagli: [
      "Per gli Agriturismi, indirizzo/telefono/email/sito (e, quando presenti, titolare e CIN) vengono ora presi da turismofvg.it quando disponibili — più ricchi e più affidabili del solo abbinamento OpenStreetMap, che resta il ripiego per gli altri 7 tipi di struttura ricettiva.",
      "Aggiornamento incrementale: qualche decina di schede nuove ogni 15 minuti, non tutte insieme — la copertura completa arriva nell'arco di alcune ore dal primo avvio, poi resta sempre aggiornata.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Strutture ricettive — indirizzo e telefono da OpenStreetMap",
    dettagli: [
      "Dove disponibile, le schede di Strutture ricettive mostrano ora anche indirizzo e telefono (etichettati \"OSM\"), trovati incrociando l'elenco della Regione con OpenStreetMap — copertura parziale e diversa per tipo, non un dato ufficiale.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Strutture ricettive — nuova sezione, 8 tipi",
    dettagli: [
      "Aggiunto l'hub Strutture ricettive (/strutture-ricettive): Bed & Breakfast, Affittacamere, Campeggi, Agriturismi, Alberghi Diffusi, Strutture Sociali, Marina, Rifugi Alpini — oltre 2100 strutture in tutta la regione, ciascuna con la propria pagina, fonte Regione FVG.",
    ],
  },
  {
    data: "26/08/2026",
    titolo: "Farmacie di turno — nuova sezione",
    dettagli: [
      "Aggiunta la sezione Farmacie di turno (/farmacie): mappa ed elenco, con un tab per provincia, delle farmacie con apertura straordinaria oggi in Friuli Venezia Giulia, fonte Regione FVG.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Aviazione — orientamento e lunghezza pista, elisuperfici",
    dettagli: [
      "Aggiunti orientamento (QFU), lunghezza e pavimentazione della pista per 22 delle strutture già presenti, fonte QNH Fly.",
      "Aggiunte 2 aviosuperfici/campi volo e 3 elisuperfici non ancora censite, per un totale di 32 strutture (da 27).",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Aviazione — nuova sezione, database aviostrutture FVG",
    dettagli: [
      "Aggiunta la sezione Aviazione (/aviazione): mappa ed elenco filtrabile di 27 aeroporti, aviosuperfici e campi volo del Friuli Venezia Giulia, fonte WebAAI.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Registro modifiche — nuova pagina, link in ogni footer",
    dettagli: [
      "Aggiunta questa pagina (/changelog) e un footer condiviso da tutte le pagine del sito, prima presente solo in homepage.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Sci — risultati completi delle gare passate",
    dettagli: [
      "Le gare già svolte nel calendario Sci si possono aprire per vedere i risultati di ogni singola gara (posizione, atleta, società, tempo, punti).",
      "Corretto lo stato mostrato per ogni gara (\"Svolta\" / \"In programma\"): ora calcolato dalla data, invece di un campo della fonte che non si aggiornava mai per le gare passate.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Sci — nuovo modulo, calendario gare FVG",
    dettagli: [
      "Aggiunta la sezione Sci in Sport (/sci): calendario delle gare del Comitato FVG della FISI (fondo, salto, combinata nordica, biathlon e altre discipline invernali), con un tab per disciplina.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Tennis — corretti i duplicati, classifiche divise per categoria",
    dettagli: [
      "Risolto un bug per cui alcuni giocatori comparivano più volte nelle classifiche.",
      "Le classifiche sono ora divise anche per categoria di grado (2ª/3ª/4ª), non solo per genere: 6 classifiche invece di 2.",
    ],
  },
  {
    data: "25/08/2026",
    titolo: "Tennis — nuovo modulo, classifica Assoluti FVG",
    dettagli: [
      "Aggiunta la sezione Tennis in Sport (/tennis): classifica dei migliori tesserati FVG in categoria Assoluti, fonte FITP.",
    ],
  },
  {
    data: "24/08/2026",
    titolo: "Avviato il collegamento del dominio monitor.fvg.it",
    dettagli: [
      "Registrato il dominio monitor.fvg.it e avviata la configurazione DNS per collegarlo al sito (in corso).",
    ],
  },
  {
    data: "24/08/2026",
    titolo: "Accessibilità — contrasto, stati, navigazione da tastiera",
    dettagli: [
      "Corretto il contrasto di diversi colori sotto la soglia minima leggibile, aggiunte etichette testuali dove uno stato (es. ritardo, superamento soglia) era indicato solo dal colore.",
      "Aggiunti titoli di pagina, un tasto per saltare direttamente al contenuto, e indicazioni per chi naviga da tastiera o con uno screen reader su menu, bottoni a scheda e mappe.",
    ],
  },
  {
    data: "24/08/2026",
    titolo: "Homepage — pannelli uniti per ridurre lo spazio vuoto",
    dettagli: [
      "Uniti i pannelli \"Bora · Vento\" e \"Pioggia\", e i pannelli \"Mare\" e \"Fiumi\", in un unico riquadro ciascuno.",
    ],
  },
  {
    data: "24/08/2026",
    titolo: "Adattamento a schermi piccoli",
    dettagli: [
      "Corretti diversi punti in cui testo o riquadri traboccavano su schermi stretti (telefono) invece di andare a capo o accorciarsi.",
    ],
  },
  {
    data: "22–24/08/2026",
    titolo: "Nuova sezione Trasporti — Voli, Ferrovie, Autobus",
    dettagli: [
      "Aggiunta la pagina Trasporti (/trasporti): arrivi/partenze di Trieste Airport, stato in tempo reale di 7 stazioni ferroviarie e 6 gruppi di fermate autobus (Trieste, Udine, Gorizia, Pordenone, Trieste Airport, Monfalcone).",
    ],
  },
  {
    data: "22–24/08/2026",
    titolo: "Nuovi moduli — Pollini, Carburanti, Balneazione",
    dettagli: [
      "Aggiunto il monitoraggio pollini (4 stazioni), i prezzi medi regionali dei carburanti e la qualità delle acque di balneazione (66 punti in tutta la regione).",
    ],
  },
  {
    data: "22–24/08/2026",
    titolo: "Nuova sezione Sport — Calcio, Basket, Baseball & Softball",
    dettagli: [
      "Aggiunto l'hub Sport (/sport) con calendari e classifiche di 9 campionati di calcio, basket e baseball/softball regionali.",
    ],
  },
  {
    data: "Fase iniziale",
    titolo: "Avvio del sito",
    dettagli: [
      "Prima versione: homepage d'insieme e 4 pagine provincia (Trieste, Udine, Gorizia, Pordenone) con meteo, allerte Protezione Civile, qualità dell'aria, viabilità e notizie regionali.",
      "Data esatta non registrata — questo registro comincia a tenere traccia sistematica dal 22/08/2026.",
    ],
  },
];
