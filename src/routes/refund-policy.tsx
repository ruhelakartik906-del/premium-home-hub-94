import { createFileRoute } from '@tanstack/react-router';
import { NoirPage, noirMeta } from '@/components/noir-page';

export const Route = createFileRoute('/refund-policy')({
  head: () => noirMeta('Refund Policy | Eliteoz', 'Eliteoz registration, membership and activation fees are non-refundable once successfully paid.'),
  component: () => (
    <NoirPage legal cta={false} eyebrow="Legal" title="Refund Policy"
      sections={[
        { title: 'Non-Refundable Fees', body: <p>All registration, membership, activation or other applicable platform fees are non-refundable once successfully paid, except where a refund is expressly required under applicable law or specifically approved by Eliteoz in writing.</p> },
        { title: 'Failed or Duplicate Transactions', body: <p>Failed or duplicate technical transactions are handled according to the actual transaction status reported by the payment provider and applicable law.</p> },
        { title: 'Contact', body: <p>privacy@eliteoz.com</p> },
      ]} />
  ),
});
