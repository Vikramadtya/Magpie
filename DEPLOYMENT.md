# Keeper: Production Deployment Guide

This guide details the exact steps to deploy the Keeper application across a modern serverless stack: **Vercel** (Frontend), **Render** (Backend), and **Neon** (Database).

> [!CAUTION]
> **Zero Hardcoded Secrets Policy:** The backend is configured to read **all** sensitive data from Environment Variables. You will configure these in Render and Vercel.

---

## 1. Database Setup (Neon.tech)

Neon is a serverless, highly-scalable PostgreSQL provider.

1. Create a free account at [Neon.tech](https://neon.tech).
2. Create a new project and database (name it `keeper`).
3. Navigate to your project **Dashboard** and find the **Connection Details** box.
4. Note down your connection credentials. **Important**: You need to construct a **JDBC URL** for the backend to use. 
   - Neon provides a standard Postgres string like: `postgresql://[user]:[password]@[endpoint]/keeper?sslmode=require`
   - You must convert this to JDBC format: `jdbc:postgresql://[endpoint]/keeper?sslmode=require`
5. Keep your `Database Username`, `Database Password`, and this `JDBC URL` handy for Step 2.

---

## 2. Backend Setup (Render.com)

Render will host the Micronaut Java backend and execute Flyway schema migrations on startup.

1. Create an account at [Render.com](https://render.com) and click **New+** > **Web Service**.
2. Connect your GitHub repository and select the Keeper project.
3. **Configuration:**
   - **Name:** `keeper-backend` (or similar)
   - **Root Directory:** `backend` (⚠️ Crucial!)
   - **Environment:** `Docker` (Render will automatically detect the `Dockerfile` inside the `backend` folder and provision a lightweight Java 21 container).
   - **Region:** Choose the same region you selected for your Neon database to minimize latency.
4. **Environment Variables:** Scroll down and add the following variables:

| Key | Value |
|-----|-------|
| `DB_URL` | The JDBC URL from Neon (e.g., `jdbc:postgresql://ep-...aws.neon.tech/keeper?sslmode=require`) |
| `DB_USER` | Your Neon database username |
| `DB_PASSWORD` | Your Neon database password |
| `JWT_SECRET` | At least 32 random characters, e.g. `openssl rand -base64 48` |
| `COOKIE_SECURE` | `true` (the default). Only set `false` for plain-http local setups |
| `GOOGLE_CLIENT_ID` | Your Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth2 Client Secret |
| `FRONTEND_URL` | *Leave blank for now. We will fill this in Step 3.* |
| `MICRONAUT_ENVIRONMENTS` | `prod` |

5. Click **Create Web Service**. Wait a few minutes for the Docker container to build and deploy. Once live, copy your Render URL (e.g., `https://magpie-baay.onrender.com`).

---

## 3. Frontend Setup (Vercel.com)

Vercel will build and host the React/Vite frontend on their global CDN.

1. Create an account at [Vercel.com](https://vercel.com) and click **Add New...** > **Project**.
2. Import your Keeper GitHub repository.
3. **Configuration:**
   - **Project Name:** `keeper-app`
   - **Framework Preset:** `Vite` (Vercel should auto-detect this).
   - **Root Directory:** Edit this and select `frontend`.
4. **Point the rewrites at your backend.** Edit `frontend/vercel.json` and replace `https://magpie-baay.onrender.com` with your Render URL. The browser only ever talks to your Vercel domain; Vercel forwards `/api`, `/oauth` and `/health` to Render. This keeps the HttpOnly refresh-token cookie first-party, so no cross-site cookies or wide-open CORS are needed. Leave `VITE_API_URL` unset.
5. Click **Deploy**. Vercel will install dependencies, run type-checks, build the static assets, and deploy them.
6. Once deployed, Vercel will provide you with a live domain (e.g., `https://keeper-app.vercel.app`).

---

## 4. Final Security Hookup

Because your backend uses strict CORS and OAuth security, you must authorize your new Vercel domain.

1. Go back to your **Render Dashboard**.
2. Go to the Environment section for your backend web service.
3. Update the `FRONTEND_URL` variable to your new Vercel domain (e.g., `https://keeper-app.vercel.app`). Do not include a trailing slash.
4. Render will automatically redeploy your backend with the new CORS and redirect rules.
5. **Google Cloud Console:** add your Vercel URL to the **Authorized JavaScript origins** and `https://keeper-app.vercel.app/oauth/callback/google` to the **Authorized redirect URIs** (the callback goes through the Vercel rewrite, not directly to Render).

---

## 5. Upgrading from the previous schema

Migration `V3__simple_ledger.sql` replaces the old ledger tables with the simple workspace/transaction model. It **keeps users and workspaces** (existing workspaces become OWNER memberships) but **drops all other old tables** (accounts, transactions, budgets and so on). Those were never written by the old stub services, but take a Neon backup/branch first if you are unsure.

## 6. Local development

```bash
make up-db          # Postgres on :5432 (docker compose)
make dev-be         # backend on :8080 (set JWT_SECRET, COOKIE_SECURE=false)
make dev-fe         # Vite on :5173, proxies /api, /oauth and /health to :8080
```

**Done!** Your full-stack application is now live on the internet, secure, and auto-deploying whenever you push to `main`.


## Live investment prices

Keeper asks Yahoo Finance for prices by default (no key, US and Indian listings). Yahoo sometimes refuses
requests that come from cloud hosts such as Render. When that happens the **Refresh prices** message on the
Investments page says what Yahoo answered, for example `yahoo: HTTP 429 Too Many Requests`, and
`GET /api/v1/market/status` shows the same.

To keep prices flowing in that case, add an official key as a fallback:

1. Get a free key at <https://www.alphavantage.co/support/#api-key>.
2. On Render, set `ALPHA_VANTAGE_API_KEY` to it and redeploy.

Keeper then tries Yahoo first and Alpha Vantage second. The free key allows roughly 25 lookups a day, enough
for a personal portfolio because prices are cached for 5 minutes and refreshed hourly. Indian shares are
looked up as `SYMBOL.BSE` automatically. Holdings that no source can price stay on the price you entered.

### Prices from your own computer

If the server cannot reach any market data source, open **Investments → From my computer**. Download `keeper_prices.py`, run `python3 keeper_prices.py` (Python 3, no packages needed), and upload the `prices.csv` it writes. Keeper matches each row to a holding by symbol and converts the price into the holding's currency. The endpoint is `POST /api/v1/workspaces/{id}/holdings/prices`.

## Encrypting your data

Keeper encrypts free-text fields before they are written to the database, so a leaked database or backup does not expose them. Each workspace gets its own random AES-256-GCM key; those keys are stored only in wrapped form, encrypted by one master key that you keep in the server environment.

Encrypted: transaction notes, comments, loan notes, trip notes and the undo history of edited transactions. Not encrypted: amounts, dates, names of accounts, categories, payees and people, and sign-in details, because the dashboards, budgets and search compute on them in the database. Search matches payee names only, since notes can no longer be searched on the server.

Set it up once on Render:

```bash
openssl rand -base64 32
```

Put the output in the `ENCRYPTION_MASTER_KEY` environment variable and redeploy. On start Keeper encrypts the notes you already have.

- **Back the key up** somewhere other than Render (a password manager). If it is lost, encrypted notes cannot be recovered.
- **Do not change it** afterwards; rotating the master key is not supported yet.
- Without the variable Keeper still works but stores new notes unencrypted and logs a warning.

## Quick add from your phone

A function on Vercel (the `/quickadd` page, an iPhone Shortcut, a Google Form script) lets you add a transaction without waiting for the server to wake up. It needs one limited database role and one Vercel variable, `QUICKADD_DATABASE_URL`; keys are created in Settings. See [docs/QUICKADD.md](docs/QUICKADD.md).

## Security notes

* The API documentation (`/swagger`) is off. Set `SWAGGER_ENABLED=true` only while you need it.
* Logging of the security library is at WARN. At TRACE it prints whole login tokens into the logs.
* Five wrong passwords lock an email for 15 minutes, on top of the per-address limit.
* A password sign-up counts as unverified until that email signs in with Google, which then cancels the
  password, so nobody can pre-register your email and share the account.
* Run `npm audit` in `frontend/` now and then, and keep `JWT_SECRET` and the database password long and private.
