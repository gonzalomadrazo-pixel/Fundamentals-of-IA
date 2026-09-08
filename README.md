# Class Signup — frontend

A single-page frontend for the class signup service. Loads the current list of
names on page load and lets anyone add a name.

- **API base:** `https://class2-signups-fall26.vercel.app/api/`
- **Stack:** plain HTML + CSS + JavaScript. No framework, no build step, no
  dependencies.
- **No auth, no API key, no class code, no database client, no email field.**
  The only network calls are `fetch` to the public API above.

## Files

| file | purpose |
|---|---|
| `index.html` | markup and state containers |
| `styles.css` | responsive styling, light + dark, mobile breakpoint |
| `app.js` | fetch calls, rendering, form handling, all UI states |
| `test.sh` | smoke test — asset check + live API contract check |

## Run it locally

No build. Serve the folder over HTTP (opening `index.html` as a `file://` URL
will not work — browsers block `fetch` from `file://`):

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static server works
(`npx serve`, `php -S localhost:8000`, VS Code Live Server, …).

## Test / verify

```bash
./test.sh
```

Checks that the three static files exist, that the source contains no
secret/key/auth tokens, and that the live API still returns the shapes the app
depends on:

- `GET /api/signups` → `200` with `{ "signups": [ { "name": ... } ] }`
- `POST /api/signups` with an existing name → `409`
- `POST /api/signups` with an empty name → `400`

Last run: **all checks passed.** The four UI states (loading, empty, success,
error) and the 409 "already signed up" message were also verified by hand in a
browser against the live API.

## Deploy to Vercel

Zero config — it is a static site.

```bash
npm i -g vercel   # if you don't have it
vercel            # from this directory; accept the defaults
vercel --prod
```

Or connect the repo at <https://vercel.com/new> and deploy with **no framework
preset** and an empty build command. `app.js` calls the API by its absolute
HTTPS URL, so it works identically from `localhost` and from any deployed
origin (the API sends `Access-Control-Allow-Origin: *`).

## Behaviour notes

- The list renders in the order the API returns it (newest first).
- After a successful signup the list is re-fetched from the API rather than
  patched locally, so it always reflects server truth; the new row is briefly
  highlighted.
- Names are inserted with `textContent`, never `innerHTML`.
- Submit is blocked for empty/whitespace-only input and the button is disabled
  while a request is in flight.

## Safety note (from the assignment)

These endpoints are deliberately public for this exercise. Anyone with the URL
can read or add names, so only submit a display name you are comfortable
sharing with the class. Do not reuse this pattern for private data.
