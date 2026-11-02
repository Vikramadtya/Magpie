/** The key that lets this phone add entries. It stays on the phone; Keeper only stores a hash. */
const KEY = 'keeper.quickadd.key';

export function readKey(storage?: Pick<Storage, 'getItem'>): string | null {
  try {
    return (storage ?? localStorage).getItem(KEY);
  } catch {
    return null;
  }
}

export function writeKey(key: string | null, storage?: Pick<Storage, 'setItem' | 'removeItem'>) {
  try {
    const target = storage ?? localStorage;
    if (key === null) target.removeItem(KEY);
    else target.setItem(KEY, key);
  } catch {
    // private mode: the key just has to be entered again next time
  }
}

export const looksLikeKey = (text: string) => /^qak_[A-Za-z0-9_-]{20,90}$/.test(text.trim());

/** Setup link: /quickadd#key=qak_... The part after # is never sent to any server or logged. */
export function takeKeyFromAddress(loc: Pick<Location, 'hash' | 'pathname' | 'search'> = window.location, history: Pick<History, 'replaceState'> = window.history): string | null {
  const found = new URLSearchParams(loc.hash.replace(/^#/, '')).get('key');
  if (!found) return null;
  history.replaceState(null, '', loc.pathname + loc.search);
  return looksLikeKey(found) ? found.trim() : null;
}
