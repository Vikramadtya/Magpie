/** Entries typed on the phone, kept until the server has confirmed them. */
export interface Entry {
  key: string;
  type: 'EXPENSE' | 'INCOME';
  amount: string;
  accountId: string;
  categoryId?: string;
  payee?: string;
  note?: string;
  occurredOn: string;
}

const KEY = 'keeper.quickadd.outbox';

export function readOutbox(storage: Pick<Storage, 'getItem'> = localStorage): Entry[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(entries: Entry[], storage: Pick<Storage, 'setItem'>) {
  try {
    storage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // storage full or blocked: the entry is still sent once, just not remembered across a reload
  }
}

export type SendResult = 'sent' | 'signed-out' | 'rejected' | 'offline';

/** Sends one entry. The same key makes a retry safe: the server stores it once. */
export async function send(entry: Entry, fetcher: typeof fetch = fetch): Promise<SendResult> {
  try {
    const res = await fetcher('/api/quickadd/submit', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Quickadd': '1' },
      body: JSON.stringify(entry),
    });
    if (res.ok) return 'sent';
    if (res.status === 401) return 'signed-out';
    if (res.status === 429 || res.status >= 500) return 'offline'; // try again later
    return 'rejected';
  } catch {
    return 'offline';
  }
}

/**
 * Tries to send everything waiting, oldest first. Stops at the first entry that cannot go now.
 * Entries the server rejects as invalid are dropped so they cannot block the rest.
 */
export async function flush(
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
  sender: (e: Entry) => Promise<SendResult> = send,
): Promise<{ sent: number; left: number; signedOut: boolean; dropped: number }> {
  let queue = readOutbox(storage);
  let sent = 0;
  let dropped = 0;
  let signedOut = false;
  while (queue.length > 0) {
    const result = await sender(queue[0]);
    if (result === 'sent') sent++;
    else if (result === 'rejected') dropped++;
    else {
      signedOut = result === 'signed-out';
      break;
    }
    queue = queue.slice(1);
    writeOutbox(queue, storage);
  }
  return { sent, left: queue.length, signedOut, dropped };
}

export function enqueue(entry: Entry, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
  writeOutbox([...readOutbox(storage), entry], storage);
}
