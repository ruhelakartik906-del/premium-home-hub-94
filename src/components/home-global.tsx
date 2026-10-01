import { Link } from '@tanstack/react-router';
import indiaImg from '@/assets/property-estate.jpg';
import intlImg from '@/assets/property-penthouse.jpg';

export function MarketSplit() {
  const sides: [string, string, string, string][] = [
    ['India', 'IN', "Explore premium properties across India's leading locations.", indiaImg],
    ['International', 'GLOBAL', 'Explore premium properties available across global markets.', intlImg],
  ];
  return (
    <section className="hg-split" aria-label="India and International properties">
      {sides.map(([t, code, d, img]) => (
        <article key={t} className="hg-side" data-reveal>
          <img src={img} alt="" loading="lazy" width={1200} height={800} />
          <div className="hg-side-inner">
            <span className="nx-eyebrow">{t} / {code}</span>
            <h2>{t}</h2>
            <p>{d}</p>
            <Link to="/properties" className="nx-btn-ghost">View {t} Properties</Link>
          </div>
        </article>
      ))}
    </section>
  );
}
