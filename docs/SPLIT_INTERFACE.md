# Keeper ↔ expense-split interface (v1)

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
