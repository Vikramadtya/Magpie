import { useCallback, useState } from 'react';

const KEY = 'keeper.home.layout';

export interface HomeLayout { order: string[]; hidden: string[] }

/**
 * The sections in the saved order, without the hidden ones. Sections the saved layout has never
 * heard of (added in a newer version) are appended, and ones that no longer exist are dropped.
 */
export function applyLayout(defaults: string[], saved: HomeLayout | null): { visible: string[]; hidden: string[] } {
  const known = new Set(defaults);
  const order = [...(saved?.order ?? []).filter((id) => known.has(id)), ...defaults.filter((id) => !(saved?.order ?? []).includes(id))];
  const hidden = new Set((saved?.hidden ?? []).filter((id) => known.has(id)));
  return { visible: order.filter((id) => !hidden.has(id)), hidden: order.filter((id) => hidden.has(id)) };
}

function read(): HomeLayout | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeLayout;
    return Array.isArray(parsed.order) && Array.isArray(parsed.hidden) ? parsed : null;
  } catch {
    return null;
  }
}

/** Which Home sections to show, in what order; remembered on this device. */
export function useHomeLayout(defaults: string[]) {
  const [saved, setSaved] = useState<HomeLayout | null>(read);
  const { visible, hidden } = applyLayout(defaults, saved);

  const store = useCallback((next: HomeLayout | null) => {
    setSaved(next);
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify(next));
      else localStorage.removeItem(KEY);
    } catch {
      /* storage can be unavailable; the change still holds for this visit */
    }
  }, []);

  const all = [...visible, ...hidden];
  return {
    visible,
    hidden,
    move: (id: string, by: -1 | 1) => {
      const i = visible.indexOf(id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= visible.length) return;
      const next = [...visible];
      [next[i], next[j]] = [next[j], next[i]];
      store({ order: [...next, ...hidden], hidden });
    },
    hide: (id: string) => store({ order: all, hidden: [...hidden, id] }),
    show: (id: string) => store({ order: all, hidden: hidden.filter((h) => h !== id) }),
    reset: () => store(null),
    customised: saved !== null,
  };
}
