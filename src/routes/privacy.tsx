import { createFileRoute } from '@tanstack/react-router';
import { NoirPage, noirMeta } from '@/components/noir-page';

const s = (title: string, text: string) => ({ title, body: <p>{text}</p> });

export const Route = createFileRoute('/privacy')({
  head: () => noirMeta('Privacy Policy | Eliteoz', 'How Eliteoz collects, uses, protects and retains personal and asset information.'),
  component: () => (
    <NoirPage legal cta={false} eyebrow="Legal" title="Privacy Policy" intro="This policy explains what information Eliteoz collects and how it is handled."
      sections={[
        s('Information We Collect', 'Name, email address, mobile number, account details, verification documents and information, payment transaction references (never full card details), device and browser information where applicable, website usage information, and property or asset information submitted by sellers.'),
        s('How We Use Information', 'To create and manage accounts, verify members and mandates, process membership activation, communicate with you, and operate and secure the platform.'),
        s('Data Security', 'We apply reasonable technical and organisational measures to protect information. No system can be guaranteed completely secure.'),
        s('Confidentiality & Restricted Access', 'Verification documents and asset information are restricted to authorised Eliteoz personnel and are not displayed to other members.'),
        s('Third-Party Service Providers', 'We may use trusted providers for hosting, payments and communications (such as SMS and email). They receive only the information needed to perform their service.'),
        s('Data Retention', 'We retain information for as long as needed for the purposes above, including incomplete registrations, and as required by law.'),
        s('Account Suspension', 'Suspension restricts access but does not by itself delete your data.'),
        s('Your Rights', 'You may request access to, correction of, or deletion of your personal information, subject to legal and operational requirements.'),
        s('Contact', 'Privacy questions: privacy@eliteoz.com'),
      ]} />
  ),
});
