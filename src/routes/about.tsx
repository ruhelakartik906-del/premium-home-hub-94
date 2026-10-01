import { createFileRoute } from '@tanstack/react-router';
import { NoirPage, noirMeta } from '@/components/noir-page';
import portraitSrc from '@/assets/col-nk-yadav.webp';
const portrait = { url: portraitSrc };

export const Route = createFileRoute('/about')({
  head: () => noirMeta('About Eliteoz | A private network built around trust', 'Eliteoz is a discreet, verification-led network for ultra-premium assets valued at ₹50 Crore and above.'),
  component: About,
});

function About() {
  return (
    <NoirPage
      eyebrow="About Eliteoz"
      title={<>A Private Network.<br />Built Around Trust.</>}
      intro="Eliteoz exists for one purpose: to let owners of trophy assets and serious, qualified buyers meet in confidence — away from public portals, brokers and noise."
      aside={<><img src={portrait.url} alt="Col. N.K. Yadav (Retd.)" className="nx-portrait-sm" loading="lazy" width={480} height={600} /><p className="nx-caption">Col. N.K. Yadav (Retd.), Indian Army</p></>}
      sections={[
        { title: 'Operational Excellence You Can Trust', body: <p>At Eliteoz, every mandate is executed under the direct supervision of Col. N.K. Yadav (Retd.), Indian Army, supported by an elite panel of Retd. ACPs, certified document experts, and legal professionals.</p> },
        { title: 'Our Philosophy', body: <p>Value at this level is best served by discretion. We believe fewer, better-qualified conversations lead to more meaningful outcomes than public exposure.</p> },
        { title: 'Our Standards', body: <p>Eliteoz considers assets valued at ₹50 Crore and above, and members who can demonstrate genuine intent and standing. Access is earned through verification, not granted by default.</p> },
        { title: 'Our Verification Approach', body: <p>Members and mandates are reviewed by our team before access is extended. Verification reduces risk, but it does not replace independent legal, financial or title due diligence by each party.</p> },
        { title: 'Our Commitment to Confidentiality', body: <p>Identity and asset documents are private and reviewed only by authorised Eliteoz personnel. Mandates are never advertised publicly.</p> },
      ]}
    />
  );
}
