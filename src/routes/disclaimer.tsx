import { createFileRoute } from '@tanstack/react-router';
import { NoirPage, noirMeta } from '@/components/noir-page';

export const Route = createFileRoute('/disclaimer')({
  head: () => noirMeta('Disclaimer | Eliteoz', 'Eliteoz connects qualified participants; verification does not replace independent due diligence.'),
  component: () => (
    <NoirPage legal cta={false} eyebrow="Legal" title="Disclaimer"
      sections={[
        { title: 'Nature of the Platform', body: <p>Eliteoz provides a platform and network for connecting qualified participants. Information submitted by users is their responsibility.</p> },
        { title: 'No Automatic Guarantees', body: <><p>Eliteoz does not automatically guarantee:</p><ul><li>ownership</li><li>title</li><li>valuation</li><li>profitability</li><li>transaction completion</li><li>legal validity of every user-provided claim</li></ul></> },
        { title: 'Independent Due Diligence', body: <p>Verification performed by Eliteoz does not replace independent legal, financial, technical or title due diligence. Users should conduct appropriate professional due diligence before completing any transaction.</p> },
      ]} />
  ),
});
