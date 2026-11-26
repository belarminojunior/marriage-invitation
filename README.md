# Marriage Invitation

Digital wedding invitation for Kendra & Aloud: two Next.js apps that share one Google Sheet.

```
apps/
  invitation/   the guest invitation          → http://localhost:3000
  admin/        the couple's management app    → http://localhost:3001
packages/
  core/         shared: wedding config, Google Sheets data layer, auth, icons, base styles
```

## The two apps

**Invitation** (`apps/invitation`): one scrolling page, one section per screen of the design.

1. Cover with the couple's photo, the parents' blessing and a music player
2. Save the date: monogram, month calendar, "add to calendar" (.ics)
3. Invitation text and the programme of the day
4. Live countdown, venue map, Google Maps / Waze directions
5. RSVP: yes/no for each person on the invite, plus a message; shows the guest's table once confirmed
6. Pre-wedding photo gallery with a lightbox
7. Gift registry: each gift can be reserved by only one invite

Each invite has a **personal link** (`/i/<id>`). The public page (`/`) shows the invitation, but RSVP and
gift reservations only work from a personal link. Opening a personal link records the "Aberto" (opened) date.

**Admin** (`apps/admin`, password protected): the couple's app.

- **Convidados**: create invites (and their personal links), assign tables, copy the link or send it by WhatsApp, filter by status
- **Mesas**: rename tables, change seats, seat or unseat invites
- **Presentes**: add, release or remove gifts and see who reserved what
- **Folha**: a spreadsheet-style overview of everything (people, gifts, tables) with a link to the real Google Sheet

Guest-facing text is in Portuguese, as in the design. All code is in English.

## Getting started

```bash
npm install
cp .env.example .env.local      # one env file at the repo root, shared by both apps
npm run dev:invitation          # http://localhost:3000
npm run dev:admin               # http://localhost:3001 (in a second terminal)
```

Other scripts (from the root): `npm run build`, `npm run typecheck`, `npm run lint`.

Without Google Sheets credentials each app runs on **in-memory demo data**. In demo mode the two apps do
**not** share data (each has its own memory); connect Google Sheets to see changes flow between them.
The admin password defaults to `noivos` in development.

## Google Sheets setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project, enable the **Google Sheets API**
   and create a **service account**. Create a JSON key for it.
2. Create an empty Google Sheet and **share it with the service account's e-mail** as *Editor*.
3. Fill in `.env.local` at the repo root:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`: the ID in the sheet URL
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: `client_email` from the JSON key
   - `GOOGLE_PRIVATE_KEY`: `private_key` from the JSON key (keep the `\n`, wrap in double quotes)
4. Start the apps. On first use they create three tabs with headers:

| Tab | One row per | Columns |
| --- | --- | --- |
| `Convidados` | person | Convite ID · Nome do convite · Pessoa · Link pessoal · Mesa · Telefone · Enviado · Aberto · Resposta · Mensagem |
| `Presentes` | gift | ID · Presente · Categoria · Estado · Reservado por · Convite ID · Data |
| `Mesas` | table | N.º · Nome da mesa · Lugares · Ocupados *(formula)* · Quem está sentado *(formula)* |

Rows in `Convidados` that share a **Convite ID** form one invite (e.g. a couple or a family). You can edit the sheet
by hand (add invites in bulk, fill in phone numbers for WhatsApp, change names) and both apps pick up the changes.
The formulas adapt to the sheet's language settings (`,` or `;` between arguments).

**Quota and caching.** Google allows about 60 read requests per minute per service account. Each app reads all
three tabs in one request and caches the result for 15 seconds; writes always read fresh data first, so a gift can
never be reserved twice. Changes made in one app (or by hand in the sheet) can take up to 15 seconds to appear in
the other, except new invites, which the invitation app looks up immediately.

## Google sign-in for the admin app

By default the admin app asks for `HOST_PASSWORD`. To let the couple sign in with their Google accounts instead:

1. In the same Google Cloud project, open **APIs & Services → OAuth consent screen**, choose **External**,
   fill in the app name and your e-mail, and publish it (only the `openid` and `email` scopes are used,
   so Google does not need to review it).
2. Open **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**,
   and add these **Authorised redirect URIs**:
   - `http://localhost:3001/auth/google/callback`
   - `https://<admin address>/auth/google/callback`
3. Set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `ADMIN_EMAILS` (comma separated) and `AUTH_SECRET`
   in `.env.local` and in the admin's Vercel project, then redeploy.

Once Google sign-in is configured the password no longer works, and only the listed accounts get in.
Removing an e-mail from `ADMIN_EMAILS` signs that person out.

## Personalising

Edit [`packages/core/src/wedding.ts`](packages/core/src/wedding.ts) for names, date, venue, parents, schedule,
M-Pesa number, etc. Put files in `apps/invitation/public/`:

- `apps/invitation/public/music/our-song.mp3`: the song for the player
- `apps/invitation/public/photos/…`: then set `coverPhoto` and `gallery.photos` in the config

## Deploying (Vercel)

Create **two Vercel projects from the same repository**:

| Project | Root Directory | Notes |
| --- | --- | --- |
| Invitation | `apps/invitation` | the address you send to guests |
| Admin | `apps/admin` | keep this address private |

Set the same environment variables in both projects: `SITE_URL` (the invitation's public address; personal
links are built from it), `HOST_PASSWORD`, `AUTH_SECRET` and the three `GOOGLE_*` Sheets values. The admin project
also needs the Google sign-in values above if you use them.
