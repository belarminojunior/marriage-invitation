# Marriage Invitation

Digital wedding invitation for Kendra & Aloud, built with Next.js (App Router) and Google Sheets as the database.

## What's inside

**Guest invitation** — one scrolling page, one section per screen of the design:

1. Cover with the couple's photo, the parents' blessing and a music player
2. Save the date — monogram, month calendar, "add to calendar" (.ics)
3. Invitation text and the programme of the day
4. Live countdown, venue map, Google Maps / Waze directions
5. RSVP — yes/no for each person on the invite, plus a message; shows the guest's table once confirmed
6. Pre-wedding photo gallery with a lightbox
7. Gift registry — each gift can be reserved by only one invite

Each invite has a **personal link** (`/i/<id>`). The public page (`/`) shows the invitation but RSVP and gift
reservations only work from a personal link. Opening a personal link records the "Aberto" (opened) date.

**Couple's panel** (`/host`, password protected):

- **Convidados** — create invites (and their personal links), assign tables, copy the link or send it by WhatsApp, filter by status
- **Mesas** — rename tables, change seats, seat or unseat invites
- **Presentes** — add, release or remove gifts and see who reserved what

Guest-facing text is in Portuguese, as in the design. All code is in English.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without Google Sheets credentials the app runs on **in-memory demo data**
(resets on restart) — try `/i/c9w3` for a guest link and `/host` (password `noivos` in development).

## Google Sheets setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project, enable the **Google Sheets API**
   and create a **service account**. Create a JSON key for it.
2. Create an empty Google Sheet and **share it with the service account's e-mail** as *Editor*.
3. Fill in `.env.local`:
   - `GOOGLE_SHEETS_SPREADSHEET_ID` — the ID in the sheet URL
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — `client_email` from the JSON key
   - `GOOGLE_PRIVATE_KEY` — `private_key` from the JSON key (keep the `\n`, wrap in double quotes)
4. Start the app. On first use it creates three tabs with headers:

| Tab | One row per | Columns |
| --- | --- | --- |
| `Convidados` | person | Convite ID · Nome do convite · Pessoa · Link pessoal · Mesa · Telefone · Enviado · Aberto · Resposta · Mensagem |
| `Presentes` | gift | ID · Presente · Categoria · Estado · Reservado por · Convite ID · Data |
| `Mesas` | table | N.º · Nome da mesa · Lugares · Ocupados *(formula)* · Quem está sentado *(formula)* |

Rows in `Convidados` that share a **Convite ID** form one invite (e.g. a couple or a family). You can edit the sheet
by hand — add invites in bulk, fill in phone numbers for WhatsApp, change names — and the site picks up the changes
on the next page load.

## Personalising

Edit [`src/config/wedding.ts`](src/config/wedding.ts) for names, date, venue, parents, schedule, M-Pesa number, etc.
Put files in `public/`:

- `public/music/our-song.mp3` — the song for the player
- `public/photos/…` — then set `coverPhoto` and `gallery.photos` in the config

## Deploying

Any Node host works (Vercel recommended). Set `SITE_URL`, `HOST_PASSWORD` and the three `GOOGLE_*` variables in the
host's environment settings.
