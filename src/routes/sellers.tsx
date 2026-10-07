import { createFileRoute } from '@tanstack/react-router';
import { NoirPage, noirMeta } from '@/components/noir-page';

export const Route = createFileRoute('/sellers')({
  head: () => noirMeta('For Sellers | Eliteoz — Present your asset, preserve its privacy', 'Enlist ₹25 Crore+ assets under a private mandate, presented only to verified buyers.'),
  component: () => (
    <NoirPage
      eyebrow="For Sellers"
      title={<>Present Your Asset.<br />Preserve Its Privacy.</>}
      intro="For owners of trophy assets who value discretion as much as price."
      cta={{ label: 'Register as Seller', to: '/register' }}
      sections={[
        { title: 'Private Mandate', body: <p>Your asset is held as a confidential mandate, not a public advertisement.</p> },
        { title: 'Controlled Exposure', body: <p>Details are shared only with verified, activated buyers.</p> },
        { title: 'Verified Buyers', body: <p>Buyers are reviewed before they gain access to mandates.</p> },
        { title: 'Confidential Process', body: <p>Ownership documents are reviewed privately by Eliteoz and never shown to other members.</p> },
        { title: 'No Public Listing', body: <p>Nothing about your asset appears on search engines or public pages.</p> },
        { title: 'No Unnecessary Enquiries', body: <p>Fewer conversations, each one qualified.</p> },
      ]}
    />
  ),
});
