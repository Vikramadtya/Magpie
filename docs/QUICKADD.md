# Quick add: add a transaction without waiting for the server

Keeper's server on Render sleeps when idle and takes a while to wake. Quick add sends entries to a
small always-on function on Vercel instead. Entries wait in Keeper's **To review** list; nothing is
recorded in your ledger until you press **Record** there.

```
phone page / iPhone Shortcut / Google Form  ->  Vercel function  ->  quick_captures (Neon)
        (carry a revocable key)                                              |
                                  Keeper (Render, when awake)  <-------------+  shown in "To review"
```

## Keys

* Create keys in Keeper under **Settings, Quick add**. A key is shown once, stored only as a hash,
  belongs to one user and one ledger, and can be revoked at any time.
* A key can only add entries to To review. It cannot read accounts, transactions or anything else.
* Limits: 20 entries a minute and 200 waiting entries per user. A repeated or double-tapped entry is
  stored once.

## One-time setup

1. **Database role** (Neon SQL editor, choose a strong password):

   ```sql
   CREATE ROLE quickadd LOGIN PASSWORD 'choose-a-long-random-password';
   GRANT USAGE ON SCHEMA public TO quickadd;
   ```

   The backend migrations grant this role its few permissions when they run *after* the role exists.
   If the role was created later, run these once:

   ```sql
   GRANT SELECT (id, email, name, deleted_at) ON users TO quickadd;
   GRANT SELECT (workspace_id, user_id, role, joined_at) ON workspace_members TO quickadd;
   GRANT SELECT (id, workspace_id, name, type, currency, is_archived, memo) ON accounts TO quickadd;
   GRANT SELECT (id, workspace_id, parent_id, name, kind, is_archived) ON categories TO quickadd;
   GRANT INSERT ON quick_captures TO quickadd;
   GRANT SELECT (id, user_id, status, created_at, idempotency_key) ON quick_captures TO quickadd;
   GRANT SELECT (id, user_id, workspace_id, key_hash, revoked_at) ON quick_api_keys TO quickadd;
   GRANT UPDATE (last_used_at) ON quick_api_keys TO quickadd;
   ```

2. **Vercel environment variable** (then redeploy): `QUICKADD_DATABASE_URL`, the Neon connection string
   for the `quickadd` role. Nothing else is needed.

3. In Keeper, open **Settings, Quick add** and create a key.

## Ways to send an entry

### A. The phone page

Open the setup link from the key dialog on your phone (`https://magpie-red.vercel.app/quickadd#key=…`;
the part after `#` is never sent to any server), or open `/quickadd` and paste the key. Then use Safari's
Share button, **Add to Home Screen**. Entries are saved on the phone first and sent in the background, so
nothing is lost offline.

### B. iPhone Shortcut (no browser)

1. Shortcuts app, **+**, add these actions:
   * **Ask for Input** (Number), prompt "Amount?"
   * **Ask for Input** (Text), prompt "What for?"
   * **Get Contents of URL**: URL `https://magpie-red.vercel.app/api/quickadd/submit`, Method **POST**,
     Headers `Authorization` = `Bearer qak_…` (your key), Request Body **JSON** with `amount` = the
     first input, `payee` = the second input, `account` = `Card` (the exact account name).
2. Name it, then add it to the Home Screen, the Action Button or Siri ("Hey Siri, add expense").

### C. Google Form

A form can't call a web address itself, but a short script attached to it can.

1. Create a Google Form with short-answer questions titled **Amount**, **Account**, **Category**,
   **Payee** and **Note** (use dropdowns for Account and Category if you like; the names must match
   Keeper's exactly, the match ignores upper and lower case).
2. In the form, open the three-dot menu, **Script editor**, and paste:

   ```js
   function onSubmit(e) {
     var key = PropertiesService.getScriptProperties().getProperty('KEEPER_KEY');
     var answers = {};
     e.response.getItemResponses().forEach(function (r) {
       answers[r.getItem().getTitle().toLowerCase()] = r.getResponse();
     });
     var res = UrlFetchApp.fetch('https://magpie-red.vercel.app/api/quickadd/submit', {
       method: 'post',
       contentType: 'application/json',
       headers: { Authorization: 'Bearer ' + key },
       payload: JSON.stringify({
         amount: answers['amount'],
         account: answers['account'],
         category: answers['category'],
         payee: answers['payee'],
         note: answers['note'],
       }),
       muteHttpExceptions: true,
     });
     if (res.getResponseCode() !== 200) {
       MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Quick add failed', res.getContentText());
     }
   }
   ```

3. Project Settings (gear), **Script properties**, add `KEEPER_KEY` = your key (so the key is not in the code).
4. Triggers (clock), **Add Trigger**: function `onSubmit`, event source **From form**, event **On form submit**.

Google keeps a copy of every submission in the form's responses, so use short, non-sensitive notes.

### D. Anything else

```bash
curl -X POST https://magpie-red.vercel.app/api/quickadd/submit \
  -H "Authorization: Bearer qak_…" -H "Content-Type: application/json" \
  -d '{"amount":"450","account":"Card","category":"Food","payee":"Swiggy","note":"lunch"}'
```

Fields: `amount` (required), `account` (name) or `accountId` (optional when you have a single account),
`category` (name) or `categoryId`, `payee`, `note`, `occurredOn` (`YYYY-MM-DD`, default today), `type`
(`EXPENSE` by default, or `INCOME`), `key` (your own repeat-protection key, optional). An unknown
category name does not lose the entry: it is kept and the name is added to the note. An unknown account
returns the list of valid ones.

## Good to know

* A pending entry's note is plain text until you record it (the encryption key lives on the Keeper
  server, not on Vercel). Keep notes short and non-sensitive.
* The phone page keeps the key and a copy of your account and category names on the phone. Use
  **Disconnect** on the page to remove them. Revoke the key in Settings to cut it off everywhere.

## Undoing it

Revert the quick-add commits. Because the backend already applied migrations `V17` and `V18`, also run
this once on Neon **before the backend restarts on the reverted code**, or Flyway will refuse to start:

```sql
DROP TABLE IF EXISTS quick_api_keys;
DROP TABLE IF EXISTS quick_captures;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
DELETE FROM flyway_schema_history WHERE version IN ('17', '18');
DROP ROLE IF EXISTS quickadd;  -- optional
```
