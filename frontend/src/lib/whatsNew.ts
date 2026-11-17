/** Newest first. Bump `id` when adding a release so everyone sees the screen once. */
export const RELEASES = [
  {
    id: '2026-11',
    title: 'What’s new in Keeper',
    items: [
      ['Bills calendar', 'See what is due when, and track subscriptions Keeper spots for you (Plan, Bills).'],
      ['Rules', 'Sort spending automatically by payee, note or amount, and apply a rule to past entries.'],
      ['Money flow', 'A chart from income to spending and savings, on Analytics, Spending.'],
      ['Customise Home', 'Move sections around or hide the ones you do not need.'],
      ['Receipts', 'Attach a photo or PDF to a transaction. Stored encrypted.'],
      ['Goals that follow an account', 'A goal can track a savings account balance for you.'],
      ['Transfers and bulk edit', 'Link a transfer’s two sides, and edit everything a filter matches in one go.'],
      ['Guided CSV import', 'Map columns once per bank and reuse the layout next time.'],
      ['One-number budget', 'Switch Budgets to a single “left to spend” figure.'],
      ['Swipe to review', 'On a phone, swipe a To review card right to record it, left to dismiss.'],
    ],
  },
] as const;

const KEY = 'keeper.whatsNew.seen';
export const latestRelease = RELEASES[0];

export function hasUnseenRelease(): boolean {
  try {
    return localStorage.getItem(KEY) !== latestRelease.id;
  } catch {
    return false;
  }
}

export function markReleaseSeen() {
  try {
    localStorage.setItem(KEY, latestRelease.id);
  } catch {
    /* ignore */
  }
}
