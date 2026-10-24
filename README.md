# תחזית הבחירות 2026 · Israeli election crowd forecast

People sign in with Google, split the 120 Knesset seats between the parties, and see the crowd's combined forecast: average seats per party with error margins, the number of forecasters, predicted turnout, and the chance that each bloc reaches 61.

SvelteKit (Svelte 5) · Node adapter · Google Identity Services · Cloud Storage · Cloud Run. Hebrew, RTL, built mobile-first. The forecast is public; signing in is needed only to vote.

## Features

- **Google sign-in, private email.** The ID token is verified on the server and exchanged for a signed, httpOnly session cookie. The email is stored only in the user's private record and never returned by any API. Publicly, people appear only by a nickname: one they choose (unique, case-insensitive) or a random Hebrew one ("שועל ממולח 42").
- **Predictions:** 120 seats, each party 0 or ≥ 4 (3.25% threshold), plus an optional turnout guess. You can start from the poll average.
- **Lock:** saving is refused from `LOCK_AT`, set to Mon 26 Oct 2026 19:00 Israel time (UTC+2), 12 hours before polls open at 07:00. Until then, people can change their prediction as often as they like.
- **Every vote is kept:** each save writes an append-only history object, and only the latest version counts in the model.
- **Totals page (`/results`):**
  - Netanyahu bloc 61+ (Likud, Shas, Otzma Yehudit, Religious Zionism, UTJ), with and without Amcha Yisrael
  - Opposition 61+ (everyone else except Ra'am and the Joint List)
  - Nobody reaches 61 without an Arab party
  - Each outcome is the share of predictions in which it happens, with a 95% Wilson interval. The three are mutually exclusive and sum to 100%.
  - Per-party mean ± 95% margin, 10th–90th percentile, a hemicycle of the rounded mean, a histogram of bloc seats, and recent forecasters.

## Configuration

See `.env.example`.

| var | |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth *Web* client. Add each origin to **Authorized JavaScript origins**. |
| `SESSION_SECRET` | 16+ chars; signs session cookies and derives user ids. |
| `STORAGE_BACKEND` | `local` (`DATA_DIR`, default `./data`) or `gcs` (`GCS_BUCKET`, optional `GCS_PREFIX`) |
| `ELECTION_AT`, `LOCK_AT` | required. ISO 8601 with offset. |
| `GA_MEASUREMENT_ID` | Google Analytics 4 id (`G-…`). Not loaded in dev mode. |
| `RESULTS_HIDDEN_UNTIL` | optional: hide the totals until this time |
| `NODE_ENV=dev` | login optional, see below. Ignored on Cloud Run. |

## Develop

```bash
npm install
cp .env.example .env   # set ELECTION_AT and LOCK_AT at least
npm run dev            # NODE_ENV=development → dev mode
npm test               # vitest: model, validation, storage/repo, sessions
npm run check          # svelte-check
```

**Dev mode** (`NODE_ENV=dev` or `development`): sign-in is optional. Without a session you are a local test voter. Google sign-in still works if `GOOGLE_CLIENT_ID` is set, and the dev bar on `/predict` lets you "sign in as" any test voter to simulate many people. Dev mode is refused when `K_SERVICE` is set (Cloud Run).

```bash
npm run build && NODE_ENV=dev PORT=3000 ELECTION_AT=2026-10-27T07:00:00+02:00 LOCK_AT=2026-10-26T19:00:00+02:00 node build
node scripts/seed.mjs http://localhost:3000 60     # 60 simulated voters
cloudflared tunnel --url http://localhost:3000      # public URL for phone testing
```

**Phone UI test:** `scripts/screens.mjs` (Playwright) loads every page at iPhone 13, 360×740 Android and desktop sizes. It fails on horizontal overflow and on tap targets under 32px, runs the predict → save flow and the menu, and saves screenshots.

## Storage layout

```
users/<uid>.json          private: email, nickname, current prediction
history/<uid>/<ts>.json   every saved version (append-only)
nicknames/<hash>.json     nickname reservations
index/shard-NN.json       public projection (nickname + seats), 16 shards
```

`<uid>` is an HMAC of the Google subject id. Writes use GCS generation preconditions (compare-and-swap with retries), so concurrent Cloud Run instances never lose an update. `PredictionRepo.rebuildIndex()` rebuilds the index from `users/`.

## Deploy (Cloud Run)

Settings are not hard-coded. Copy `deploy.env.example` to `deploy.env` (git-ignored) and fill it in, or export the same variables.

```bash
./deploy.sh setup    # first time: bucket (versioned), service account, session secret, then deploy
./deploy.sh          # build and redeploy
./deploy.sh domain   # map DOMAIN to the service and print the DNS record to add
```

## Parties and blocs

The ballot, the blocs and the poll baseline are in `src/lib/parties.ts`.
