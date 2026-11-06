import { useCallback, useEffect, useState } from 'react';

const KEY = 'keeper.privacy';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function apply(on: boolean) {
  document.documentElement.classList.toggle('privacy', on);
}

/** Blurs every figure on screen until it is hovered or pressed; remembered on this device. */
export function usePrivacy(): [boolean, () => void] {
  const [on, setOn] = useState(read);
  useEffect(() => apply(on), [on]);
  const toggle = useCallback(() => {
    setOn((v) => {
      try {
        localStorage.setItem(KEY, v ? '0' : '1');
      } catch {
        /* storage can be unavailable; the switch still works for this visit */
      }
      return !v;
    });
  }, []);
  return [on, toggle];
}

/** Applies the saved choice before the first paint so numbers never flash. */
export function initPrivacy() {
  apply(read());
}
