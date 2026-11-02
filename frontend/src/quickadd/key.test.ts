import { describe, expect, it } from 'vitest';
import { looksLikeKey, readKey, takeKeyFromAddress, writeKey } from './key';

const KEY = `qak_${'a'.repeat(43)}`;
const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
};

describe('quick add key', () => {
  it('is kept and forgotten', () => {
    const store = memory();
    expect(readKey(store)).toBeNull();
    writeKey(KEY, store);
    expect(readKey(store)).toBe(KEY);
    writeKey(null, store);
    expect(readKey(store)).toBeNull();
  });

  it('recognises a key and nothing else', () => {
    expect(looksLikeKey(` ${KEY} `)).toBe(true);
    for (const bad of ['', 'ksk_abc', 'qak_short', `${KEY}!`]) expect(looksLikeKey(bad)).toBe(false);
  });

  it('takes the key from the setup link and removes it from the address bar', () => {
    const calls: string[] = [];
    const history = { replaceState: (_s: unknown, _t: string, url?: string | URL | null) => void calls.push(String(url)) };
    expect(takeKeyFromAddress({ hash: `#key=${KEY}`, pathname: '/quickadd', search: '' }, history)).toBe(KEY);
    expect(calls).toEqual(['/quickadd']);
    expect(takeKeyFromAddress({ hash: '', pathname: '/quickadd', search: '' }, history)).toBeNull();
    expect(takeKeyFromAddress({ hash: '#key=junk', pathname: '/quickadd', search: '' }, history)).toBeNull();
  });
});
