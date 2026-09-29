import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { PageShell } from '@/components/eliteoz';

export type NoirSection = { title: string; body: ReactNode };

export function NoirPage({ eyebrow, title, intro, sections, aside, cta = true, legal = false, children }: { eyebrow: string; title: ReactNode; intro?: ReactNode; sections?: NoirSection[]; aside?: ReactNode; cta?: boolean | { label: string; to: '/register' | '/login' }; legal?: boolean; children?: ReactNode }) {
  const ctaLink = typeof cta === 'object' ? cta : { label: 'Become a Member', to: '/register' as const };
  return (
    <PageShell>
      <main className="nx">
        <section className="nx-dark nx-page-hero">
          <div className="nx-wrap">
            <span className="nx-eyebrow">{eyebrow}</span>
            <h1 className="nx-page-title">{title}</h1>
            {intro && <p className="nx-page-intro">{intro}</p>}
          </div>
        </section>
        {(sections || aside || children) && (
          <section className={`nx-sec ${legal ? 'nx-light' : 'nx-ivory'}`}>
            <div className={`nx-wrap ${aside ? 'nx-page-split' : ''}`}>
              {aside && <aside>{aside}</aside>}
              <div className={legal ? 'nx-legal' : 'nx-page-list'}>
                {sections?.map((s, i) => (
                  <article key={s.title}>
                    {!legal && <span className="nx-num">{String(i + 1).padStart(2, '0')}</span>}
                    <h2>{s.title}</h2>
                    <div className="nx-page-body">{s.body}</div>
                  </article>
                ))}
                {children}
              </div>
            </div>
          </section>
        )}
        {cta && (
          <section className="nx-dark nx-sec nx-final">
            <div className="nx-wrap">
              <span className="nx-eyebrow">By Invitation. By Verification.</span>
              <h2>Enter the private network.</h2>
              <div className="nx-ctas nx-center">
                <Link to={ctaLink.to} className="nx-btn">{ctaLink.label}</Link>
                <Link to="/login" className="nx-btn-ghost">Log in</Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </PageShell>
  );
}

export const noirMeta = (title: string, description: string) => ({
  meta: [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
});
