import { createFileRoute, Link } from '@tanstack/react-router';
import { Footer, PublicHeader } from '@/components/eliteoz';
import logoSrc from '@/assets/eliteoz-logo.webp';
const logo = { url: logoSrc };
import portraitSrc from '@/assets/col-nk-yadav.webp';
const portrait = { url: portraitSrc };
import heroImg from '@/assets/home-hero-abstract.jpg';
import { useReveal, SelectiveGrid, PrincipleMark, AssetSilhouettes, Horizon } from '@/components/nx-graphics';
import { MarketSplit } from '@/components/home-global';

export const Route = createFileRoute('/')({
  errorComponent: () => <div className="section container"><h2>Something went wrong. Please refresh.</h2></div>,
  head: () => ({
    meta: [
      { title: 'ELITEOZ | The Private Realm of Ultra-Premium Assets' },
      { name: 'description', content: 'Eliteoz is an exclusive, invitation-based portal for off-market, verified ultra-premium assets valued at INR 25 Crore & above.' },
      { property: 'og:title', content: 'ELITEOZ | Where INR 25 Cr.+ assets change hands in complete silence' },
      { property: 'og:description', content: 'A private network connecting verified owners and qualified buyers of ultra-premium assets with complete discretion.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Home,
});

const NoirHeader = PublicHeader;

const faqs: [string, string][] = [
  ['What is Eliteoz?', 'Eliteoz is an exclusive, invitation-based network for ultra-premium assets valued at INR 25 Crore & above, connecting verified owners and qualified buyers privately.'],
  ['What does the ₹25 Crore threshold mean?', 'Eliteoz considers only assets valued at INR 25 Crore & above. This keeps the network focused on serious owners, qualified buyers and significant transactions.'],
  ['Is Eliteoz a public property portal?', 'No. Eliteoz is a private network. There are no public asset listings.'],
  ['Who can register?', 'Owners of qualifying assets, serious buyers, and their authorized representatives can register as a Buyer or Seller.'],
  ['Can anyone view assets?', 'No. Asset information is visible only to registered, verified and activated members, according to their role.'],
  ['How does buyer access work?', 'Buyers register, complete verification and activation, and then receive access to qualifying opportunities.'],
  ['How does seller access work?', 'Sellers register, complete verification and activation, and then present qualifying assets within the private environment. Each asset is reviewed before it is shown to members.'],
  ['Why is verification required?', 'Verification keeps the network limited to genuine participants and genuine mandates.'],
  ['Does registration automatically provide dashboard access?', 'No. Registration is the first step. Access follows verification and completion of the applicable activation requirements.'],
  ['What happens if payment is incomplete?', 'Your registration is saved, but dashboard access stays locked until the activation payment is completed.'],
  ['How is private information controlled?', 'Private information is visible only according to account status, role and authorization. Identity documents are reviewed only by the Eliteoz team.'],
  ['What types of assets can be enlisted?', 'Companies, factories, industries, commercial buildings, luxury houses, farmhouses, plots, residences and other high-value holdings valued at ₹25 Crore & above.'],
  ['Can an authorized representative register?', 'Yes. Authorized representatives of owners or buyers may register on their behalf.'],
];

const way = ['No Market Noise.', 'Verified Mandates Only.', 'No Broker Chains.', 'No Casual Enquiries.', 'Principal to Principal.', 'Your identity, your asset, and your transaction are protected with absolute secrecy.', 'Buyer & Seller confidentiality is non-negotiable.', 'If you own a trophy asset worth over INR 25 Crore or wish to acquire one in complete privacy, you have come to the right place.', 'We value your time and your privacy.'];
const assets = ['Companies', 'Factories', 'Industries', 'Commercial Buildings', 'Luxury Houses', 'Farmhouses', 'Plots', 'Residences', 'Other High-Value Holdings'];
const owners = ['Trophy asset owners', 'HNI / UHNI families', 'Industrialists', 'Promoters', 'Family offices', 'Authorized representatives'];
const buyers = ['Serious investors', 'HNI / UHNI buyers', 'Industrial groups', 'Family offices', 'Strategic acquirers', 'Authorized representatives'];
const notFor = ['Casual asset browsing', 'Mass-market asset enquiries', 'Unverified intermediaries', 'Low-value asset searches', 'Unnecessary broker chains', 'Public marketplace-style transactions'];

function Home() {
  useReveal();
  return (
    <div className="nx">
      <NoirHeader />
      <main>
        <section className="nx-hero">
          <img src={heroImg} alt="" width={1920} height={1088} fetchPriority="high" decoding="async" />
          <div className="nx-wrap nx-hero-inner nx-fade">
            <span className="nx-om" lang="sa">ॐ गणेशाय नमः</span>
            <span className="nx-eyebrow">Off-Market. Discreet. Genuine.</span>
            <h1 className="nx-hero-title">Eliteoz - The Private Realm of Ultra-Premium Assets</h1>
            <span className="nx-rule" />
            <p className="nx-lead">Absolute Confidentiality for Buyers &amp; Sellers Where Assets Worth INR 25 Cr. &amp; Above Change Hands in Complete Silence.</p>
            <div className="nx-ctas">
              <Link to="/properties" className="nx-btn">Explore Assets</Link>
              <Link to="/register" className="nx-btn hg-btn-outline">Private Access</Link>
            </div>
          </div>
        </section>

        <section className="nx-dark nx-sec hg-intro">
          <div className="nx-wrap nx-split">
            <div className="nx-body">
              <p className="nx-quote">Absolute Confidentiality for Buyers &amp; Sellers.</p>
              <p>Eliteoz is not for everyone. And that&apos;s intentional.</p>
              <p>We are a private, by-invitation-only network for UHNI individuals, families, and serious investors who value privacy over publicity.</p>
              <p>We operate exclusively in the realm of ultra-premium assets valued at INR 25 Crore &amp; above.</p>
            </div>
            <div>
              <span className="nx-eyebrow">The Eliteoz Way</span>
              <ul className="nx-way">{way.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          </div>
        </section>
        <MarketSplit />


        <section className="nx-dark nx-sec nx-grain">
          <div className="nx-wrap nx-split" data-reveal>
            <div><span className="nx-eyebrow">Not a Property Portal.</span><h2>Not Listed.<br />Not Advertised.<br />Not Open to Everyone.</h2></div>
            <div className="nx-body">
              <p>Eliteoz is a private network — not a public marketplace.</p>
              <p>There are no public asset listings, unnecessary enquiries or uncontrolled exposure.</p>
              <p>Access is restricted to registered, verified and appropriately activated participants.</p>
              <SelectiveGrid />
            </div>
          </div>
        </section>

        <section className="nx-dark nx-sec nx-threshold">
          <div className="nx-wrap" data-reveal>
            <span className="nx-eyebrow">The Eliteoz Threshold</span>
            <span className="nx-big nx-big-lit">₹25 CRORE+</span>
            <div className="nx-split">
              <h2>A Different Class of Asset.<br />A Different Standard of Access.</h2>
              <div className="nx-body">
                <p>Eliteoz operates exclusively within the ultra-premium segment, focusing on assets valued at INR 25 Crore &amp; above.</p>
                <p className="nx-quote">This threshold is intentional.</p>
                <p>It keeps the network focused on serious owners, qualified buyers and significant transactions.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="nx-ivory nx-sec">
          <div className="nx-wrap">
            <span className="nx-eyebrow">Participants</span><h2>For a Different Class of Participant.</h2>
            <div className="nx-split">
              <div><h3>For Owners</h3><ul className="nx-assets">{owners.map((a) => <li key={a}>{a}</li>)}</ul></div>
              <div><h3>For Buyers</h3><ul className="nx-assets">{buyers.map((a) => <li key={a}>{a}</li>)}</ul></div>
            </div>
          </div>
        </section>

        <section className="nx-dark nx-sec">
          <div className="nx-wrap nx-split">
            <div><span className="nx-eyebrow">Qualification</span><h2>Eliteoz Is Not for Everyone.</h2><p className="nx-muted">Eliteoz is deliberately designed for a narrow segment.</p></div>
            <div className="nx-body">
              <p>Not intended for:</p>
              <ul className="nx-assets">{notFor.map((a) => <li key={a}>{a}</li>)}</ul>
              <p className="nx-quote">If the requirement is below ₹25 Crore, Eliteoz may not be the right platform.</p>
            </div>
          </div>
        </section>

        <section className="nx-dark nx-sec" id="standard">
          <div className="nx-wrap">
            <span className="nx-eyebrow">Principles</span><h2>The Eliteoz Standard.</h2>
            <div className="nx-cols3 nx-cols4" data-reveal>
              {[['Discretion', 'No public exposure. No unnecessary visibility. No uncontrolled enquiries.'], ['Verification', 'Participants and mandates undergo appropriate verification before access is granted.'], ['Controlled Access', 'Private information is visible only according to account status, role and authorization.'], ['Professional Execution', 'A structured ecosystem supported by document experts, legal professionals and experienced oversight.']].map(([t, d], i) => <article key={t}><PrincipleMark kind={i as 0 | 1 | 2 | 3} /><span className="nx-num">0{i + 1}</span><h3>{t}</h3><p>{d}</p></article>)}
            </div>
          </div>
        </section>

        <section className="nx-ivory nx-sec">
          <div className="nx-wrap">
            <span className="nx-eyebrow">How We Work</span><h2>The Eliteoz Way.</h2>
            <div className="nx-cols3 nx-journey" data-reveal>
              <article><span className="nx-num">01</span><h3>Off-Market & Verified Mandates</h3><p>We deal only in genuine, private mandates. No public listings. No market noise.</p></article>
              <article><span className="nx-num">02</span><h3>No Unnecessary Queries</h3><p>We understand the value of time at this level. We aim to connect serious participants directly — without unnecessary broker chains or casual enquiries.</p></article>
              <article><span className="nx-num">03</span><h3>Confidentiality by Design</h3><p>Identity, asset information and transaction-related information are handled through controlled access and confidentiality-focused processes.</p></article>
            </div>
          </div>
        </section>

        <section className="nx-light nx-sec">
          <div className="nx-wrap nx-split">
            <div><span className="nx-eyebrow">Asset Categories</span><h2>Significant Assets.<br />Considered Broadly.</h2></div>
            <ul className="nx-assets">{assets.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
          <div className="nx-wrap" data-reveal><AssetSilhouettes /></div>
        </section>

        <section className="nx-dark nx-sec nx-grain">
          <div className="nx-wrap nx-why nx-why-dark" data-reveal>
            <figure><img src={portrait.url} alt="Col. N.K. Yadav (Retd.), Indian Army" width={560} height={700} loading="lazy" /><figcaption><strong>Col. N.K. Yadav (Retd.)</strong><span>Indian Army</span></figcaption></figure>
            <div>
              <span className="nx-eyebrow">Eliteoz</span>
              <h2>Leadership &amp;<br />Oversight.</h2>
              <div className="nx-body">
                <p>At Eliteoz, every mandate is executed under the direct supervision of Col. N.K. Yadav (Retd.), Indian Army, supported by an elite panel of Retd. ACPs, certified document experts and legal professionals.</p>
                <p>We are committed to secure, confidential and carefully verified execution with transparency and professional oversight.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="nx-light nx-sec">
          <div className="nx-wrap">
            <span className="nx-eyebrow">The Process</span><h2>Private Access.<br />By Design.</h2>
            <ol className="nx-steps nx-corridor" data-reveal>
              {[['Register', 'Create your Buyer or Seller account.'], ['Verify', 'Complete the required identity and account verification process.'], ['Activate', 'Complete the applicable activation/payment requirements.'], ['Access', 'Receive access according to your verified role and account status.']].map(([t, d], i) => <li key={t}><span className="nx-num">0{i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}
            </ol>
          </div>
        </section>

        <section className="nx-dark nx-sec">
          <div className="nx-wrap nx-journeys">
            <article><span className="nx-eyebrow">Sellers</span><h3>Your Asset.<br />Your Privacy.</h3><p>Present qualifying assets within a controlled private environment rather than exposing them to the public market.</p><Link to="/register" search={{ role: 'seller' }} className="nx-btn">Request Seller Access</Link></article>
            <article><span className="nx-eyebrow">Buyers</span><h3>Access the<br />Extraordinary.</h3><p>Gain access to qualifying opportunities after registration, verification and activation.</p><Link to="/register" search={{ role: 'buyer' }} className="nx-btn">Request Buyer Access</Link></article>
          </div>
        </section>

        <section className="nx-dark nx-statement">
          <div className="nx-wrap">
            <h2>In This Segment,<br />Discretion Is Everything.</h2>
            <p>At the ultra-premium level, exposure is not an advantage.</p>
            <p>Eliteoz is designed around controlled access, participant verification and privacy-conscious handling of sensitive information.</p>
            <span className="nx-eyebrow">Private · Verified · Controlled</span>
          </div>
        </section>

        <section className="nx-light nx-sec">
          <div className="nx-wrap nx-split">
            <div><span className="nx-eyebrow">FAQ</span><h2>Questions.<br />Answered.</h2></div>
            <div className="nx-faq">{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
          </div>
        </section>

        <section className="nx-dark nx-sec nx-final nx-final-h">
          <Horizon />
          <div className="nx-wrap" data-reveal>
            <h2>For Those Who Value<br />Privacy Over Publicity.</h2>
            <p className="nx-muted">If you own a trophy asset or are looking to acquire one in complete privacy, you have arrived at the right place.</p>
            <div className="nx-ctas nx-center"><Link to="/register" className="nx-btn">Request Private Access</Link><Link to="/how-it-works" className="nx-btn-ghost">Learn How Eliteoz Works</Link></div>
            <p className="nx-eyebrow nx-mt">Eliteoz — Where INR 25 Cr. &amp; Above Assets Change Hands in Complete Silence.</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
