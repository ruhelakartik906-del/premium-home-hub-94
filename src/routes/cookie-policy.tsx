import { createFileRoute } from '@tanstack/react-router';
import { NoirPage, noirMeta } from '@/components/noir-page';

export const Route = createFileRoute('/cookie-policy')({
  head: () => noirMeta('Cookie Policy | Eliteoz', 'The essential cookies and browser storage Eliteoz uses to keep you signed in and secure.'),
  component: () => (
    <NoirPage legal cta={false} eyebrow="Legal" title="Cookie Policy"
      sections={[
        { title: 'Essential Cookies & Storage', body: <p>Eliteoz uses essential cookies and browser storage required for the website to function.</p> },
        { title: 'Authentication / Session', body: <p>Used to keep you signed in to your member workspace.</p> },
        { title: 'Security', body: <p>Used to protect your account and the platform from misuse.</p> },
        { title: 'Preferences', body: <p>Small preferences, such as properties added for comparison, may be stored in your browser.</p> },
        { title: 'Analytics', body: <p>Eliteoz does not currently use third-party advertising or analytics cookies.</p> },
        { title: 'Managing Cookies', body: <p>You can clear or block cookies in your browser settings. Blocking essential cookies will prevent sign-in.</p> },
      ]} />
  ),
});
