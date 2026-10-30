# Sharing money in Keeper

Everything a person can edit stays in their own ledger. There are three ways to bring other
people in, from lightest to most connected.

## 1. Spent by (one ledger)
Mark a transaction as spent by a person ("Wife"). It stays in your ledger and moves your card
balance, but is left out of your own spending, analytics and forecast. A budget can opt in to
counting it ("Include spending by others"). The dashboard shows what others spent from your
accounts.

## 2. Lend an account
The owner invites someone by email (Accounts → Lend). On accepting, the guest gets a *memo*
copy of the account in their own ledger. It takes expenses only and is never part of their net
worth. Each expense the guest records is mirrored into the owner's ledger as spending by the
guest (`transactions.mirror_of` links the copy). Edits, deletes and restores follow; the owner can
recategorise or delete their copy without affecting the guest's. The guest never sees the owner's
balance or other transactions. The owner can revoke at any time.

## 3. Household (read-only combined view)
A household stores only its members, what each member agrees to share (spending / net worth /
investments) and budget targets. Figures are computed live from the members' own ledgers and
expressed in the household currency.

- A lent-card purchase is one purchase: when both people share spending it is counted from the
  guest's ledger and the owner's mirrored copy is skipped.
- Household budgets match categories by name across ledgers; personal budgets are unaffected.
- Trips with the same name in each ledger are combined.
- Leaving a household removes your data from the view immediately.
