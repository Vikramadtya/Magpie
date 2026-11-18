import { useEffect, useState } from 'react';

/** Coins drop into a jar while the app starts. Pure CSS motion; calm for people who prefer less movement. */
export function CoinJar({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className="coin-jar overflow-visible">
      <defs>
        <clipPath id="jar-clip"><rect x="30" y="46" width="60" height="60" rx="14" /></clipPath>
      </defs>
      <g className="jar-body">
        <g clipPath="url(#jar-clip)">
          <rect x="30" y="46" width="60" height="60" fill="rgb(var(--accent-rgb) / 0.10)" />
          <rect className="jar-fill" x="30" y="70" width="60" height="40" fill="rgb(var(--accent-rgb) / 0.28)" />
          {[0, 1, 2].map((i) => (
            <g key={i} className="coin" style={{ animationDelay: `${i * 0.55}s` }}>
              <circle cx={50 + i * 10} cy="8" r="9" fill="#FFCC00" stroke="#E0A800" strokeWidth="2" />
              <circle cx={50 + i * 10} cy="8" r="4.5" fill="none" stroke="#E0A800" strokeWidth="1.5" />
            </g>
          ))}
        </g>
        <rect x="30" y="46" width="60" height="60" rx="14" fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="4" />
        <rect x="24" y="38" width="72" height="10" rx="5" fill="rgb(var(--accent-rgb))" />
      </g>
    </svg>
  );
}

export function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-background" role="status" aria-label="Loading">
      <CoinJar />
      <p className="text-sm text-secondary h-5 transition-opacity" style={{ opacity: slow ? 1 : 0 }}>
        Waking the server. This can take up to a minute.
      </p>
    </div>
  );
}
