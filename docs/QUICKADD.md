# Quick add from your phone (`/quickadd`)

A small page that opens instantly on your phone, even while the Keeper server on Render is asleep.
You type an amount, pick an account, and press Add. The entry waits in Keeper's **To review** list;
nothing is recorded in your ledger until you press **Record** there.

## How it works

```
phone  ->  /quickadd (Vercel, always on)  ->  quick_captures table (Neon)
                                                      |
                 Keeper (Render, when awake)  <-------+   shown in "To review"
```

* The page and its two server functions (`frontend/api/quickadd/`) run on Vercel, so they never wait for Render.
* Sign-in is Google's own. The function checks Google's signed proof, finds the Keeper user with that
  verified email, and starts a 30-day login cookie that belongs to this site only.
* The functions connect to Neon with a **separate, very limited database role** (`quickadd`). It can
  read account and category names for your workspace and add rows to `quick_captures`. It cannot read
  transactions, notes, passwords or anything else.
* Entries are saved on the phone first and sent in the background, so they are never lost if the
  connection drops. Sending twice is harmless (each entry has a key, the server stores it once).
* Limits: 20 entries a minute and 200 waiting entries per user.

## One-time setup

1. **Create the database role** (Neon SQL editor, choose a strong password):

   ```sql
   CREATE ROLE quickadd LOGIN PASSWORD 'choose-a-long-random-password';
   GRANT USAGE ON SCHEMA public TO quickadd;
   ```

   The grants are applied by the backend migration when it runs *after* the role exists. If the role was
   created after the migration had already run, run this once instead:

   ```sql
   GRANT SELECT (id, email, name, deleted_at) ON users TO quickadd;
   GRANT SELECT (workspace_id, user_id, role, joined_at) ON workspace_members TO quickadd;
   GRANT SELECT (id, workspace_id, name, type, currency, is_archived, memo) ON accounts TO quickadd;
   GRANT SELECT (id, workspace_id, parent_id, name, kind, is_archived) ON categories TO quickadd;
   GRANT INSERT ON quick_captures TO quickadd;
   GRANT SELECT (id, user_id, status, created_at, idempotency_key) ON quick_captures TO quickadd;
   ```

2. **Vercel environment variables** (Project settings, then redeploy):

   | Name | Value |
   |---|---|
   | `QUICKADD_DATABASE_URL` | Neon connection string for the `quickadd` role |
   | `QUICKADD_SECRET` | 32+ random characters (`openssl rand -base64 48`), signs the login cookie |
   | `GOOGLE_CLIENT_ID` | the same Google OAuth client ID Keeper already uses |

3. **Google Cloud console**: in the OAuth client, add `https://magpie-red.vercel.app` under
   *Authorized JavaScript origins* (the Google button on `/quickadd` needs it).

4. **On the phone**: open `https://magpie-red.vercel.app/quickadd`, sign in once, then Share and
   *Add to Home Screen* for a one-tap icon.

## Good to know

* Only Google accounts whose verified email matches a Keeper user (as owner or editor) are accepted.
  This is the same rule Keeper's own Google sign-in uses.
* A pending entry's note is stored as plain text until you record it (the notes encryption key lives
  on the Keeper server, not on Vercel). Keep notes short and non-sensitive.
* Account and category names are copied to the phone so the form works offline. Signing out clears them.
* Sign out on the page, or clear the site's data, to end a session. Sessions also expire after 30 days.

## Undoing it

Revert the commit. Because the backend already applied migration `V17`, also run this once on Neon
**before the backend restarts on the reverted code**, or Flyway will refuse to start:

```sql
DROP TABLE IF EXISTS quick_captures;
DELETE FROM flyway_schema_history WHERE version = '17';
DROP ROLE IF EXISTS quickadd;  -- optional
```
