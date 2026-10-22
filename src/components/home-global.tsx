import { Link } from '@tanstack/react-router';
import indiaImg from '@/assets/property-estate.webp';

export function MarketSplit() {
  const sides: [string, string, string, string][] = [
    ['India', 'IN', "Explore ultra-premium assets across India's leading locations.", indiaImg],
  ];
  return (
    <section className="hg-split" aria-label="India and global assets">
      {sides.map(([t, code, d, img]) => (
        <article key={t} className="hg-side" data-reveal>
          <img src={img} alt="" loading="lazy" decoding="async" width={1920} height={1280} />
          <div className="hg-side-inner">
            <span className="nx-eyebrow" data-code={code}>{t}</span>
            <h2>{t}</h2>
            <p>{d}</p>
            <Link to="/properties" className="nx-btn-ghost">View {t} Assets</Link>
          </div>
        </article>
      ))}
    </section>
  );
}
