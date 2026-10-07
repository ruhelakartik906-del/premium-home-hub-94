import { createFileRoute } from '@tanstack/react-router';
import { NoirPage, noirMeta } from '@/components/noir-page';

const s = (title: string, text: string) => ({ title, body: <p>{text}</p> });

export const Route = createFileRoute('/terms')({
  head: () => noirMeta('Terms & Conditions | Eliteoz', 'The terms governing registration, membership, verification and use of the Eliteoz platform.'),
  component: () => (
    <NoirPage legal cta={false} eyebrow="Legal" title="Terms & Conditions" intro="By registering with or using Eliteoz you agree to these terms."
      sections={[
        s('Eligibility', 'You must be at least 18 years old and legally able to enter binding agreements, or be an authorised representative of such a person or entity.'),
        s('Asset Value Positioning', 'Eliteoz is intended for assets valued at ₹25 Crore & above. Eliteoz may decline mandates or members outside this positioning.'),
        s('Account Registration & Accurate Information', 'Users are responsible for providing accurate, complete and current information, including during mobile/email verification.'),
        s('Buyer and Seller Roles', 'Each account is registered as Buyer or Seller and receives access appropriate to that role.'),
        s('Account Verification', 'Eliteoz may suspend or restrict accounts where required information or verification is incomplete, inaccurate, suspicious, or otherwise fails platform requirements.'),
        s('Membership / Activation Payment', 'Dashboard access requires successful membership activation. Registered accounts remain pending until activation is confirmed.'),
        s('Dashboard & Private Asset Access', 'Property and mandate information is available only to verified, activated members and must not be shared outside the platform.'),
        s('Seller Responsibility', 'Sellers must have the right to offer the asset and must provide truthful information and documents.'),
        s('Buyer Responsibility', 'Buyers must act in good faith and conduct their own due diligence.'),
        s('Verification Limitations', 'Eliteoz verification does not guarantee title, ownership, valuation or transaction completion.'),
        s('Prohibited Activities', 'Misrepresentation, scraping, sharing confidential information, circumventing the platform, and any unlawful use are prohibited.'),
        s('Confidentiality Obligations', 'Members must keep information received through Eliteoz confidential.'),
        s('Intellectual Property', 'The Eliteoz name, logo and content belong to Eliteoz and may not be used without permission.'),
        s('Suspension & Termination', 'Eliteoz may suspend or terminate accounts that breach these terms or platform requirements.'),
        s('Platform Availability & Third-Party Services', 'The platform is provided as available. Some features depend on third-party providers outside our control.'),
        s('Limitation of Liability', 'To the extent permitted by law, Eliteoz is not liable for indirect or consequential losses arising from use of the platform or transactions between members.'),
        s('Governing Law', 'These terms are governed by the laws of India, with courts at New Delhi having jurisdiction.'),
        s('Contact', 'Privacy@eliteoz.com'),
      ]} />
  ),
});
