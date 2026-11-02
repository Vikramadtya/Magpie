import { describe, expect, it } from 'vitest';
import { enqueue, flush, readOutbox, send, type Entry, type SendResult } from './outbox';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};
const entry = (key: string): Entry => ({ key, type: 'EXPENSE', amount: '10', accountId: 'a', occurredOn: '2026-11-02' });

describe('outbox', () => {
  it('sends everything in order and empties the queue', async () => {
    const store = memory();
    enqueue(entry('k1'), store);
    enqueue(entry('k2'), store);
    const order: string[] = [];
    const out = await flush(store, async (e) => (order.push(e.key), 'sent'));
    expect(order).toEqual(['k1', 'k2']);
    expect(out).toMatchObject({ sent: 2, left: 0 });
    expect(readOutbox(store)).toEqual([]);
  });

  it('keeps entries while offline and tries again later', async () => {
    const store = memory();
    enqueue(entry('k1'), store);
    enqueue(entry('k2'), store);
    expect(await flush(store, async () => 'offline')).toMatchObject({ sent: 0, left: 2 });
    expect(readOutbox(store)).toHaveLength(2);
    expect(await flush(store, async () => 'sent')).toMatchObject({ sent: 2, left: 0 });
  });

  it('keeps entries and reports it when the key was refused', async () => {
    const store = memory();
    enqueue(entry('k1'), store);
    expect(await flush(store, async () => 'bad-key')).toMatchObject({ left: 1, badKey: true });
  });

  it('drops an entry the server rejects so it cannot block the rest', async () => {
    const store = memory();
    enqueue(entry('bad'), store);
    enqueue(entry('good'), store);
    const results: Record<string, SendResult> = { bad: 'rejected', good: 'sent' };
    const out = await flush(store, async (e) => results[e.key]);
    expect(out).toMatchObject({ sent: 1, dropped: 1, left: 0 });
  });

  it('maps responses: 401 bad key, 400 rejected, 5xx and network errors offline', async () => {
    const respond = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;
    expect(await send(entry('k'), respond(200))).toBe('sent');
    expect(await send(entry('k'), respond(401))).toBe('bad-key');
    expect(await send(entry('k'), respond(400))).toBe('rejected');
    expect(await send(entry('k'), respond(503))).toBe('offline');
    expect(await send(entry('k'), (async () => { throw new TypeError('network'); }) as unknown as typeof fetch)).toBe('offline');
  });

  it('survives corrupt stored data', () => {
    expect(readOutbox({ getItem: () => '{not json' })).toEqual([]);
  });
});
