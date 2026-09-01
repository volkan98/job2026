# Remix of Remix of Job Genie

Titolo progetto: “Job Outreach Assistant – CV → Email → Invio”

Obiettivo:
Crea una web app (responsive) in italiano che aiuta l’utente a candidarsi: carica un CV, genera una sintesi e una email professionale personalizzata, trova aziende nella zona indicata con relative email pubbliche, e consente l’invio email collegando Gmail o Outlook/Hotmail.

Funzionalità richieste
1) Upload CV + parsing

L’utente può caricare CV in PDF/DOCX (drag & drop).

Estrai automaticamente: nome, città, contatti, profilo, competenze, esperienze (ruoli, aziende, date), istruzione, lingue.

Mostra un’anteprima strutturata e modificabile (campi editabili) prima di generare testi.

2) Sintesi del CV

Genera una sintesi breve (3–5 righe) e una sintesi completa (bullet points).

Output in italiano, tono professionale.

Evidenzia: anni di esperienza, mansioni principali, punti forti, disponibilità, zona.

3) Generazione email candidatura

Genera email in 3 varianti: Breve / Standard / Molto formale.

Personalizzazione per azienda:

campi: Nome azienda, settore, ruolo desiderato (opzionale), distanza/area (opzionale)

inserisce automaticamente competenze rilevanti dal CV.

Campi email generati:

Oggetto

Corpo email

Firma (contatti)

Editor WYSIWYG per modifiche manuali + pulsante “Rigenera”.

4) Ricerca aziende + email nella zona

Input: zona (città, CAP, raggio km) + categorie (es. “produzione”, “metalmeccanica”, “packaging”, “farmaceutico”, “logistica”, “verniciatura”).

Output lista aziende con:

Nome azienda

Indirizzo

Sito

Email pubblica (se disponibile)

Telefono

Fonte/link dove è stata trovata l’email

Regole: usare solo email pubbliche (sito aziendale, directory affidabili). Se non disponibile, mostra “Non trovata” e suggerisci “usa form contatti”.

Filtri: distanza, settore, “email trovata sì/no”.

Esporta: CSV + copia-incolla tabella.

5) Connessione email + invio

Connessione sicura con OAuth:

Google Gmail (OAuth + Gmail API)

Microsoft Outlook/Hotmail (OAuth + Microsoft Graph)

Dopo login: consenti invio email direttamente dall’app:

selezione multipla aziende ma invio uno a uno (niente CC visibile)

allegare CV (file originale) e/o lettera di presentazione PDF

log invii: data, destinatario, oggetto, stato (inviato/errore)

Template anti-spam:

rate limit (es. max 20 email/ora)

reminder di non usare “To” con più aziende

6) UI / UX

4 pagine principali:

Carica CV

Sintesi CV

Trova aziende (zona + filtri)

Email & Invio (editor + selezione aziende + invio)

Design pulito, mobile first, con step progress (wizard).

7) Sicurezza e privacy

Mostra una privacy notice: il CV contiene dati personali.

Salvataggio locale o database con consenso esplicito.

Cifratura per token OAuth, logout e revoca.

Non salvare password email (solo OAuth).

Stack/implementazione

Frontend: React/Next.js (o equivalente).

Backend: Node/Express o serverless.

DB: SQLite/Postgres (per log invii e aziende salvate).

Integrazioni:

Gmail API (send)

Microsoft Graph (sendMail)

Provider ricerca aziende (es. Places + scraping controllato / directory) con fonti citate.

Output atteso

App funzionante con:

upload CV → sintesi → email personalizzata

ricerca aziende nella zona + email pubbliche con fonte

login Gmail/Outlook → invio email con allegato CV → storico invii

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://job2026.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/97885a55-732d-4221-9265-8d77cee0752b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
