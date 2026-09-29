import { useEffect } from 'react';

/** Adds .nx-in to [data-reveal] elements as they enter the viewport (lightweight, no library). */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('nx-in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('nx-in'); io.unobserve(en.target); } }), { threshold: 0.18 });
    els.forEach((e) => io.observe(e));
    const hero = document.querySelector<HTMLElement>('.nx-hero');
    const onScroll = () => { if (hero) hero.style.setProperty('--nx-s', String(Math.min(window.scrollY / 800, 1))); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);
}

const G = 'var(--nx-gold)';

/** Grid of dim lines with one lit central structure — selective access. */
export function SelectiveGrid() {
  const cols = Array.from({ length: 13 }, (_, i) => i * 40);
  return (
    <svg className="nx-gfx" viewBox="0 0 480 320" aria-hidden="true">
      {cols.map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="320" stroke={G} strokeOpacity=".08" />)}
      {Array.from({ length: 9 }, (_, i) => i * 40).map((y) => <line key={`h${y}`} x1="0" y1={y} x2="480" y2={y} stroke={G} strokeOpacity=".08" />)}
      <g className="nx-draw" stroke={G} fill="none" strokeWidth="1.2">
        <rect x="200" y="80" width="80" height="160" />
        <rect x="220" y="40" width="40" height="200" />
        <line x1="160" y1="240" x2="320" y2="240" />
        <line x1="240" y1="40" x2="240" y2="240" strokeOpacity=".5" />
      </g>
    </svg>
  );
}

/** Custom principle marks. */
export function PrincipleMark({ kind }: { kind: 0 | 1 | 2 | 3 }) {
  return (
    <svg className="nx-mark" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke={G} strokeWidth="1">
      {kind === 0 && <><rect x="12" y="12" width="40" height="40" /><rect x="24" y="4" width="36" height="36" fill="var(--nx-mark-bg,#0A0A0A)" /><line x1="24" y1="4" x2="60" y2="40" strokeOpacity=".4" /></>}
      {kind === 1 && <><circle cx="32" cy="32" r="22" /><line x1="32" y1="4" x2="32" y2="60" /><line x1="4" y1="32" x2="60" y2="32" /><rect x="24" y="24" width="16" height="16" transform="rotate(45 32 32)" /></>}
      {kind === 2 && <><path d="M10 58V18a22 22 0 0 1 44 0v40" /><path d="M22 58V26a10 10 0 0 1 20 0v32" /><line x1="4" y1="58" x2="60" y2="58" /></>}
      {kind === 3 && <>{[12, 24, 36, 48].map((v) => <g key={v}><line x1={v} y1="8" x2={v} y2="56" /><line x1="8" y1={v} x2="56" y2={v} /></g>)}<rect x="24" y="24" width="12" height="12" fill={G} fillOpacity=".25" /></>}
    </svg>
  );
}

/** Blueprint-style silhouettes of asset types. */
export function AssetSilhouettes() {
  return (
    <svg className="nx-gfx nx-gfx-wide" viewBox="0 0 900 220" aria-hidden="true" fill="none" stroke={G} strokeWidth="1" strokeOpacity=".7">
      <g className="nx-draw">
        <path d="M20 200V130l70-40 70 40v70M50 200v-40h40v40" />
        <path d="M190 200v-50h120v50M210 150l40-30 40 30M200 200h100" />
        <path d="M340 200V60h90v140M355 80h60M355 100h60M355 120h60M355 140h60M355 160h60" />
        <path d="M460 200v-70l40 20v-20l40 20v-20l40 20v70M600 200V90h14v110" />
        <path d="M650 200v-80h80v80M660 120V70h20v50M700 120V85h14v35" />
        <path d="M760 200V40h60l20 20v140M775 60h40M775 80h50M775 100h50M775 120h50M775 140h50M775 160h50" />
        <line x1="0" y1="200" x2="900" y2="200" strokeOpacity=".4" />
      </g>
    </svg>
  );
}

/** Horizon line for the final section. */
export function Horizon() {
  return (
    <svg className="nx-horizon" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="nxh" x1="0" x2="1"><stop offset="0" stopColor="#C5A880" stopOpacity="0" /><stop offset=".5" stopColor="#C5A880" stopOpacity=".8" /><stop offset="1" stopColor="#C5A880" stopOpacity="0" /></linearGradient></defs>
      <path d="M0 150 L260 150 L300 120 L380 120 L400 100 L470 100 L480 150 L760 150 L800 130 L880 130 L900 150 L1200 150" fill="none" stroke="url(#nxh)" strokeWidth="1" />
    </svg>
  );
}
