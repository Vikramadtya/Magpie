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
| `JWT_SECRET` | Generate a secure key (e.g., run `openssl rand -base64 32` in your terminal) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth2 Client Secret |
| `FRONTEND_URL` | *Leave blank for now. We will fill this in Step 3.* |
| `MICRONAUT_ENVIRONMENTS` | `prod` |

5. Click **Create Web Service**. Wait a few minutes for the Docker container to build and deploy. Once live, copy your Render URL (e.g., `https://keeper-backend.onrender.com`).

---

## 3. Frontend Setup (Vercel.com)

Vercel will build and host the React/Vite frontend on their global CDN.

1. Create an account at [Vercel.com](https://vercel.com) and click **Add New...** > **Project**.
2. Import your Keeper GitHub repository.
3. **Configuration:**
   - **Project Name:** `keeper-app`
   - **Framework Preset:** `Vite` (Vercel should auto-detect this).
   - **Root Directory:** Edit this and select `frontend`.
4. **Environment Variables:**
   - Expand the Environment Variables section and add:
   - **Name:** `VITE_API_URL`
   - **Value:** Your Render backend URL (e.g., `https://keeper-backend.onrender.com`)
5. Click **Deploy**. Vercel will install dependencies, run type-checks, build the static assets, and deploy them.
6. Once deployed, Vercel will provide you with a live domain (e.g., `https://keeper-app.vercel.app`).

---

## 4. Final Security Hookup

Because your backend uses strict CORS and OAuth security, you must authorize your new Vercel domain.

1. Go back to your **Render Dashboard**.
2. Go to the Environment section for your backend web service.
3. Update the `FRONTEND_URL` variable to your new Vercel domain (e.g., `https://keeper-app.vercel.app`). Do not include a trailing slash.
4. Render will automatically redeploy your backend with the new CORS and redirect rules.
5. **Google Cloud Console:** Don't forget to go to your GCP OAuth dashboard and add your Vercel URL to the **Authorized JavaScript origins** and `https://keeper-app.vercel.app/auth/callback` to the **Authorized redirect URIs**.

**Done!** Your full-stack application is now live on the internet, secure, and auto-deploying whenever you push to `main`.
