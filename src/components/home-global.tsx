import { Link } from '@tanstack/react-router';
import indiaImg from '@/assets/property-estate.jpg';

export function MarketSplit() {
  const sides: [string, string, string, string][] = [
    ['India', 'IN', "Explore ultra-premium assets across India's leading locations.", indiaImg],
  ];
  return (
    <section className="hg-split" aria-label="India and global assets">
      {sides.map(([t, code, d, img]) => (
        <article key={t} className="hg-side" data-reveal>
          <img src={img} alt="" loading="lazy" width={1200} height={800} />
          <div className="hg-side-inner">
            <span className="nx-eyebrow">{t} / {code}</span>
            <h2>{t}</h2>
            <p>{d}</p>
            <Link to="/properties" className="nx-btn-ghost">View {t} Assets</Link>
          </div>
        </article>
      ))}
    </section>
  );
}
