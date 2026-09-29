import { createFileRoute, Link } from '@tanstack/react-router';
import { PageShell } from '@/components/eliteoz';
import { noirMeta } from '@/components/noir-page';

export const Route = createFileRoute('/properties/')({
  head: () => noirMeta('Private Access Required | Eliteoz', 'Eliteoz mandates are available only to verified and activated members.'),
  component: () => (
    <PageShell>
      <main className="nx">
        <section className="nx-dark nx-page-hero nx-gate" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
          <div className="nx-wrap">
            <span className="nx-eyebrow">Members Only</span>
            <h1 className="nx-page-title">Private Access Required</h1>
            <p className="nx-page-intro">Eliteoz properties and mandates are available only to verified and activated members.</p>
            <div className="nx-ctas nx-center">
              <Link to="/login" className="nx-btn">Log In</Link>
              <Link to="/register" className="nx-btn-ghost">Become a Member</Link>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  ),
});
