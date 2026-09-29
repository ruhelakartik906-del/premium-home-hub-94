import { createFileRoute } from '@tanstack/react-router';
import { NoirPage, noirMeta } from '@/components/noir-page';

export const Route = createFileRoute('/how-it-works')({
  head: () => noirMeta('How Eliteoz Works | Registration, verification and access', 'From registration to qualified asset access: the Eliteoz membership, verification and activation process explained.'),
  component: () => (
    <NoirPage
      eyebrow="The Process"
      title={<>Measured Steps.<br />Controlled Access.</>}
      intro="Registration does not automatically mean dashboard access. A registered account remains pending until the required verification and activation conditions are complete."
      sections={[
        { title: 'Registration', body: <p>Choose Buyer or Seller and provide your name, mobile number, email and the required details.</p> },
        { title: 'Mobile / Email Verification', body: <p>Confirm your contact details with a one-time code.</p> },
        { title: 'Role Selection', body: <p>Your role determines your private workspace — Buyer or Seller. Authorised representatives may register on behalf of a principal.</p> },
        { title: 'Account Verification', body: <p>Submit identity and supporting documents from your private dashboard within the stated verification window. Incomplete verification may lead to suspension.</p> },
        { title: 'Payment / Activation', body: <p>Membership activation is required before dashboard access. If payment is not completed, the account stays in pending status and you can return later to complete it.</p> },
        { title: 'Admin Verification', body: <p>The Eliteoz team reviews submissions and mandates before access is extended.</p> },
        { title: 'Dashboard Access', body: <p>Activated members enter their private Buyer or Seller workspace.</p> },
        { title: 'Qualified Asset Access', body: <p>Verified buyers see qualifying mandates; sellers present assets to verified buyers only.</p> },
      ]}
    />
  ),
});
