import { createFileRoute } from '@tanstack/react-router';
import { AdminSetup } from '@/components/auth-flow';
import { adminSetupAvailable } from '@/lib/admin-setup.functions';

export const Route = createFileRoute('/admin-setup')({
  loader: () => adminSetupAvailable(),
  head: () => ({ meta: [{ title: 'Master Admin Setup | ELITEOZ' }, { name: 'description', content: 'One-time Master Admin setup for Eliteoz.' }, { name: 'robots', content: 'noindex' }, { property: 'og:title', content: 'Master Admin Setup | ELITEOZ' }, { property: 'og:description', content: 'One-time Master Admin setup for Eliteoz.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  errorComponent: () => <div className="section container"><h2>Setup is unavailable right now.</h2></div>,
  component: () => { const { available } = Route.useLoaderData(); return <AdminSetup available={available} />; },
});
