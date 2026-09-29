import { createFileRoute } from '@tanstack/react-router';
import { NoirPage, noirMeta } from '@/components/noir-page';

export const Route = createFileRoute('/buyers')({
  head: () => noirMeta('For Buyers | Eliteoz — Access without exposure', 'Private, verified access to ultra-premium off-market assets valued at ₹50 Crore and above.'),
  component: () => (
    <NoirPage
      eyebrow="For Buyers"
      title="Access Without Exposure."
      intro="For families, promoters and investors seeking assets that never reach the open market."
      cta={{ label: 'Register as Buyer', to: '/register' }}
      sections={[
        { title: 'Private Access', body: <p>Mandates are visible only inside your member workspace, never on public pages.</p> },
        { title: 'Verified Participants', body: <p>Every seller and mandate is reviewed before presentation.</p> },
        { title: 'High-Value Assets', body: <p>Companies, industries, commercial buildings, estates and landmark residences of ₹50 Crore and above.</p> },
        { title: 'Confidential Communication', body: <p>Your interest is shared only through Eliteoz — not broadcast.</p> },
        { title: 'Controlled Visibility', body: <p>You decide what you reveal, and when.</p> },
        { title: 'Serious Transactions', body: <p>A network designed for decisive buyers, not casual browsing.</p> },
      ]}
    />
  ),
});
