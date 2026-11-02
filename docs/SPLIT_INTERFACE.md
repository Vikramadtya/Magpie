# Keeper ↔ expense-split interface (v1.1)

Group expenses are entered in the split app. It sends them to Keeper, where the owner reviews and records
them in **To review**. Keeper never writes back to the split app.

## Connecting

In Keeper: **Settings → Connect your expense-split app → Connect an app.** Keeper shows, once:

- a **connection code**: `keeper-connect:v1:` + base64 of `{"url": "<address>", "token": "<token>"}`
- or the address and token separately.

The token (`ksk_…`) is tied to one person's ledger and can only call the endpoints below.
It is stored hashed and can be revoked in Settings. Send it as `Authorization: Bearer ksk_…`.

## `GET {address}/ping`

Checks the connection.

```json
{ "ok": true, "ledger": "Personal", "currency": "USD", "interfaceVersion": 1 }
```

`401` means the token is missing, wrong or revoked.

## `POST {address}/split`

Send up to 200 items. Sending the same item again is safe (it changes nothing). Send it again with different
data and a new `version` to update it. Each item gets its own result.

### Expense

```json
{
  "type": "EXPENSE",
  "externalId": "exp_8f3a",
  "version": "2026-03-04T10:15:00Z",
  "groupId": "grp_lisbon",
  "groupName": "Lisbon",
  "occurredOn": "2026-03-04",
  "currency": "EUR",
  "totalMinor": 30000,
  "title": "Dinner",
  "paidByMe": true,
  "myShareMinor": 10000,
  "shares": [
    { "name": "Ravi", "shareMinor": 10000 },
    { "name": "Sam",  "shareMinor": 10000 }
  ]
}
```

- Amounts are integers in minor units (cents). `myShareMinor` plus the `shares` must add up to `totalMinor`.
- `paidByMe: false` means a friend paid; only your own share matters then (`shares` may be empty or listed).
- `externalId` identifies the item in the split app. `version` is any string that changes when the item changes
  (an `updatedAt` works). If omitted, Keeper derives one from the data.

### Settlement

```json
{
  "type": "SETTLEMENT",
  "externalId": "set_41c9",
  "occurredOn": "2026-03-10",
  "currency": "EUR",
  "totalMinor": 10000,
  "direction": "RECEIVED",
  "counterparty": "Ravi",
  "groupId": "grp_lisbon",
  "groupName": "Lisbon"
}
```

`direction` is `RECEIVED` (they paid you) or `PAID` (you paid them).

### Deleting

Send the item's `type`, `externalId`, `occurredOn`, `currency` and `"deleted": true`.

### Response

```json
{ "results": [ { "externalId": "exp_8f3a", "type": "EXPENSE", "outcome": "RECEIVED", "message": null } ] }
```

`outcome` is one of `RECEIVED`, `UPDATED`, `UNCHANGED`, `REMOVED`, `REJECTED` (with a `message`).

## What Keeper does with an accepted item

| Item | Recorded in Keeper |
|---|---|
| Expense you paid | One expense for **your share** (counts as spending, added to the trip named after the group) and a **loan to each friend** for theirs. Together they equal what left the account. |
| Expense a friend paid | Your share as spending on an **“Owed to friends”** account, which goes negative until you settle. |
| Settlement received | Repays that person's loans. Not income. |
| Settlement paid | Moves money onto “Owed to friends”. Not spending. |

If an accepted item is later changed or deleted in the split app, it returns to **To review** and nothing is
changed in Keeper until the owner chooses to apply it.


## Version 1.1 (additions; v1 items keep working)

### Same ids on both sides
Every person is identified by the split app's own stable `personId` (never by name).

**1. Introduce yourself once, when connecting.**

```
POST {address}/connect
{ "me": { "personId": "u_asha", "name": "Asha", "email": "asha@example.com" } }
→ { "linked": true, "emailMatched": true }
```

The connection is now bound to that person. Saying the same thing again is fine; a different `personId`
is refused (`409`), so ids cannot drift: disconnect in Keeper and connect again to change it.
`emailMatched` only tells the owner whether the email equals their Keeper email; it does not block linking.
`GET /ping` reports `"linked": true` once this is done.

**2. Keeper keeps a mapping table** (`split_people`, one row per friend the split app mentions), keyed by
`personId`, holding the split app's name and email and the **label** Keeper uses for that friend's loans.
Every share carries `personId` (and optionally `email`); a settlement or transfer carries `counterpartyId`
(and optionally `counterpartyEmail`). Rows are created and their name/email refreshed automatically. The
label follows the split app's name until the owner edits it in Settings, after which it stays put. Two
friends given the same label are treated as one person. Names are only labels; they never decide who is who.

### Several payers
An expense lists what each person **paid** and what each person **owes**, in the currency's minor unit:

```json
{
  "type": "EXPENSE", "externalId": "exp_8f3a", "version": "7",
  "groupId": "grp_lisbon", "groupName": "Lisbon", "ledger": "GROUP",
  "occurredOn": "2026-03-04", "currency": "EUR", "currencyExponent": 2, "totalMinor": 30000,
  "title": "Dinner", "category": "Food", "tags": ["trip"], "note": "Cash and card",
  "splitType": "EQUAL",
  "payers": [ { "personId": "u_me", "name": "Asha", "paidMinor": 20000 },
              { "personId": "u_ravi", "name": "Ravi", "paidMinor": 10000 } ],
  "shares": [ { "personId": "u_me", "name": "Asha", "shareMinor": 10000 },
              { "personId": "u_ravi", "name": "Ravi", "shareMinor": 10000 },
              { "personId": "u_sam", "name": "Sam", "shareMinor": 10000 } ]
}
```

`payers` sum to `totalMinor`, and so do `shares`. The split app sends the item to **each** connected payer
or participant, from their own point of view (`me` differs per connection), so every payer is told their part.
Keeper works out the rest: money you paid beyond your share becomes loans to the people who are short;
your share of what others paid goes to "Owed to friends".

### Transfer (money given to or received from a friend)
Money handed to a friend outside any split, such as lending cash:

```json
{ "type": "TRANSFER", "externalId": "tr_77", "version": "1", "occurredOn": "2026-03-12",
  "currency": "EUR", "totalMinor": 25000, "direction": "PAID",
  "counterparty": "Ravi", "counterpartyId": "u_ravi", "title": "Cash for the trip" }
```

`direction` is `PAID` (you gave) or `RECEIVED` (you got). Keeper records a **loan** (to them or from them),
which is neither spending nor income. Repaying it is a normal settlement.

### Currency
`currency` is an ISO 4217 code and `totalMinor`, `paidMinor`, `shareMinor` use **that currency's real minor
unit** (JPY 0 decimals, USD 2, KWD 3). `currencyExponent` must match; Keeper rejects the item otherwise.

### Friend-to-friend ledgers
`"ledger": "DIRECT"` marks the private ledger between two friends. Keeper creates no trip for it. Payments
between you and a friend there are ordinary settlements. Items in which you are neither payer nor participant
are never sent.

### Information for review
`category`, `tags`, `note` and `splitType` are hints. In **To review** the owner can **add** the item as it is,
**edit** (category, account, trip, amounts charged) before adding, or **ignore** it. Nothing is recorded
until they choose.
