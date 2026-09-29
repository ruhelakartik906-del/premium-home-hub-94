import { createFileRoute, Link } from '@tanstack/react-router';
import { Footer } from '@/components/eliteoz';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import logo from '@/assets/eliteoz-logo.webp.asset.json';
import portrait from '@/assets/col-nk-yadav.webp.asset.json';
import heroImg from '@/assets/home-estate-noir.jpg';

export const Route = createFileRoute('/')({
  errorComponent: () => <div className="section container"><h2>Something went wrong. Please refresh.</h2></div>,
  head: () => ({
    meta: [
      { title: 'ELITEOZ | Private network for ₹50 Crore+ assets' },
      { name: 'description', content: 'Eliteoz is an exclusive, invitation-based portal for off-market, verified ultra-premium assets valued at ₹50 Crore and above.' },
      { property: 'og:title', content: 'ELITEOZ | Where ₹50 Crore+ assets change hands in complete silence' },
      { property: 'og:description', content: 'A private network connecting verified owners and qualified buyers of ultra-premium assets with complete discretion.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Home,
});

const nav = [['Properties', '/properties'], ['How It Works', '/how-it-works'], ['For Buyers', '/buyers'], ['For Sellers', '/sellers'], ['About', '/about'], ['Contact', '/contact']] as const;

function NoirHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="nx-header">
      <div className="nx-wrap nx-header-row">
        <Link to="/" aria-label="Eliteoz home" className="nx-logo"><img src={logo.url} alt="ELITEOZ" width={940} height={560} /></Link>
        <nav className="nx-nav">{nav.map(([l, p]) => <Link key={p} to={p}>{l}</Link>)}</nav>
        <div className="nx-actions">
          <Link to="/login" className="nx-login">Log in</Link>
          <Link to="/register" className="nx-btn nx-btn-sm">Become a Member</Link>
          <button className="nx-burger" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {open && <nav className="nx-mobile-nav">{nav.map(([l, p]) => <Link key={p} to={p} onClick={() => setOpen(false)}>{l}</Link>)}<Link to="/login" onClick={() => setOpen(false)}>Log in</Link></nav>}
    </header>
  );
}

const faqs: [string, string][] = [
  ['What is Eliteoz?', 'Eliteoz is an exclusive, invitation-based platform dedicated to properties and assets valued at ₹50 Crore and above, connecting verified owners with qualified buyers in complete confidence.'],
  ['What is the minimum asset value considered?', 'Eliteoz considers assets valued at ₹50 Crore and above.'],
  ['Is Eliteoz a public property portal?', 'No. Eliteoz is a private network. Mandates are not publicly advertised.'],
  ['Who can register as a buyer?', 'Qualified buyers seeking ultra-premium assets can register and follow the verification and membership activation process.'],
  ['Who can register as a seller?', 'Owners of qualifying ultra-premium assets can register to enlist their assets for consideration.'],
  ['Can authorized representatives register?', 'Yes. Authorized representatives of buyers or owners may register on their behalf.'],
  ['Are properties publicly visible?', 'No. Listed assets are visible only to members after verification and membership activation.'],
  ['How is confidentiality maintained?', 'Identity and asset documents remain private and are reviewed only by the Eliteoz team. They are never displayed to other members.'],
  ['How does the verification process work?', 'After registration, members submit the required documents from their private dashboard. The Eliteoz team reviews them and updates the status.'],
  ['What happens after registration?', 'You complete mobile confirmation and membership activation as applicable, then submit verification documents from your private dashboard.'],
];

const assets = ['Companies', 'Factories', 'Industries', 'Commercial Buildings', 'Luxury Houses', 'Farmhouses', 'Plots', 'Residences', 'Other High-Value Holdings'];

function Home() {
  return (
    <div className="nx">
      <NoirHeader />
      <main>
        <section className="nx-hero">
          <img src={heroImg} alt="" width={1600} height={960} fetchPriority="high" decoding="async" />
          <div className="nx-wrap nx-hero-inner nx-fade">
            <span className="nx-om" lang="sa">ॐ गणेशाय नमः</span>
            <span className="nx-eyebrow">A Private Network for Ultra-Premium Assets</span>
            <h1>Off-Market.<br />Discreet.<br />Genuine.</h1>
            <span className="nx-rule" />
            <p className="nx-lead">Eliteoz is an exclusive portal for ultra-premium assets valued at ₹50 Crores and above.</p>
            <p>A private, invitation-based network connecting verified owners and qualified buyers with complete discretion, confidentiality and absolute attention to detail.</p>
            <div className="nx-ctas">
              <Link to="/register" className="nx-btn">Become a Member →</Link>
              <Link to="/how-it-works" className="nx-btn-ghost">Explore How It Works →</Link>
            </div>
          </div>
        </section>

        <section className="nx-strip">
          <div className="nx-wrap nx-strip-grid">
            {[['₹50 Crore+', 'Asset threshold'], ['Private', 'By invitation'], ['Verified', 'Mandates'], ['Absolute', 'Confidentiality']].map(([a, b]) => <div key={a}><strong>{a}</strong><span>{b}</span></div>)}
          </div>
        </section>

        <section className="nx-light nx-sec">
          <div className="nx-wrap nx-split">
            <div><span className="nx-eyebrow">Welcome to Eliteoz</span><h2>Privacy Is Paramount.</h2></div>
            <div className="nx-body">
              <p>Eliteoz — an exclusive, invitation-based platform dedicated to properties and assets valued at ₹50 Crore and above.</p>
              <p>In the world of high-value transactions, privacy is paramount. Eliteoz provides a secure, confidential and meticulously curated ecosystem where owners of prestigious assets connect directly with verified, qualified buyers — without unnecessary public exposure.</p>
              <span className="nx-rule" />
            </div>
          </div>
        </section>

        <section className="nx-dark nx-sec">
          <div className="nx-wrap">
            <span className="nx-big">₹50 CRORE+</span>
            <div className="nx-split">
              <h2>We Are Not A Property Portal.</h2>
              <div className="nx-body">
                <p>Eliteoz is not designed for mass-market property discovery. We operate exclusively in the realm of ultra-premium properties and assets valued at ₹50 Crores and above.</p>
                <p>We are a private, by-invitation network for HNI families, industrialists and serious investors who value privacy over publicity.</p>
                <p className="nx-quote">In this segment, discretion is not a feature. It is everything.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="nx-light nx-sec">
          <div className="nx-wrap">
            <span className="nx-eyebrow">Our Principles</span><h2>The Eliteoz Way.</h2>
            <div className="nx-cols3">
              <article><span className="nx-num">01</span><h3>Off-Market & Verified Mandates Only</h3><p>We deal only in genuine, private mandates. No public listings. No market noise.</p></article>
              <article><span className="nx-num">02</span><h3>No Unnecessary Queries — Ever</h3><p>We understand the value of time at this level. We connect principal to principal only. No broker chains. No casual enquiries. No time-wasters.</p></article>
              <article><span className="nx-num">03</span><h3>100% Secrecy Assured</h3><p>Your identity, your asset and your transaction are protected with absolute discretion. Buyer and seller confidentiality is non-negotiable.</p></article>
            </div>
          </div>
        </section>

        <section className="nx-ivory nx-sec">
          <div className="nx-wrap nx-split">
            <div><span className="nx-eyebrow">What Can Be Listed</span><h2>Significant Assets.<br />Considered Broadly.</h2><p className="nx-muted">Eliteoz welcomes prestigious assets and holdings that meet our ultra-premium threshold.</p></div>
            <ul className="nx-assets">{assets.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        </section>

        <section className="nx-light nx-sec">
          <div className="nx-wrap nx-why">
            <figure><img src={portrait.url} alt="Col. N.K. Yadav (Retd.), Indian Army" width={560} height={700} loading="lazy" /><figcaption><strong>Col. N.K. Yadav (Retd.)</strong><span>Indian Army</span></figcaption></figure>
            <div>
              <span className="nx-eyebrow">Why Eliteoz</span>
              <h2>Operational Excellence You Can Trust.</h2>
              <div className="nx-body">
                <p>At Eliteoz, every mandate is executed under the direct supervision of Col. N.K. Yadav (Retd.), Indian Army, supported by an elite panel of Retd. ACPs, certified document experts and legal professionals.</p>
                <p>We are committed to ensuring secure, confidential and fully verified execution with absolute transparency.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="nx-dark nx-sec">
          <div className="nx-wrap">
            <span className="nx-eyebrow">Membership</span><h2>One Network.<br />Two Private Journeys.</h2>
            <div className="nx-journeys">
              <article><span className="nx-eyebrow">For Owners</span><h3>Your Asset.<br />Your Privacy.</h3><p>Owners and authorized representatives can privately enlist qualifying ultra-premium assets for consideration by a curated network of verified buyers.</p><Link to="/register" search={{ role: 'seller' }} className="nx-btn-ghost">Enlist as Seller →</Link></article>
              <article><span className="nx-eyebrow">For Buyers</span><h3>Access the<br />Extraordinary.</h3><p>Qualified buyers and authorized representatives can register with Eliteoz and, following successful verification and membership activation, gain privileged access to exclusive listed assets.</p><Link to="/register" search={{ role: 'buyer' }} className="nx-btn-ghost">Register as Buyer →</Link></article>
            </div>
          </div>
        </section>

        <section className="nx-light nx-sec">
          <div className="nx-wrap">
            <span className="nx-eyebrow">How It Works</span><h2>A Simple.<br />Secure Process.</h2>
            <ol className="nx-steps">
              {[['Register', 'Choose Buyer or Seller and submit your details.'], ['Verify', 'Complete the required verification process.'], ['Activate', 'Complete membership activation as applicable.'], ['Access', 'Enter the private Eliteoz network.']].map(([t, d], i) => <li key={t}><span className="nx-num">0{i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}
            </ol>
          </div>
        </section>

        <section className="nx-dark nx-statement">
          <div className="nx-wrap"><span className="nx-giant">₹50 CRORE+</span><span className="nx-eyebrow">The Minimum Asset Value We Consider</span><p>Eliteoz operates exclusively within the ultra-premium segment.</p></div>
        </section>

        <section className="nx-ivory nx-sec">
          <div className="nx-wrap nx-journeys nx-journeys-light">
            <article><span className="nx-eyebrow">For Sellers</span><h3>Your Asset.<br />Your Privacy.</h3><p>We invite owners and authorized representatives to enlist premium assets for consideration within our private network.</p><p>Your asset is not publicly advertised. Your information is handled with discretion and shared only within the appropriate verified network.</p><Link to="/register" search={{ role: 'seller' }} className="nx-btn">Enlist Your Asset →</Link></article>
            <article><span className="nx-eyebrow">For Buyers</span><h3>Exclusive Properties.<br />Exclusive Access.</h3><p>To maintain exclusivity and confidentiality, buyers or their authorized representatives are required to register with Eliteoz.</p><p>Following successful verification and membership activation, qualified members receive privileged access to the exclusive collection of listed properties and assets.</p><Link to="/register" search={{ role: 'buyer' }} className="nx-btn">Become a Member →</Link></article>
          </div>
        </section>

        <section className="nx-dark nx-sec">
          <div className="nx-wrap nx-split">
            <h2>No Market Noise.<br />No Unnecessary Queries.</h2>
            <div className="nx-body"><p>At this level, time and privacy matter more than visibility.</p><p>Eliteoz is built around discreet introductions, verified mandates and serious intent.</p><span className="nx-rule" /></div>
          </div>
        </section>

        <section className="nx-light nx-sec">
          <div className="nx-wrap nx-split">
            <div><span className="nx-eyebrow">FAQ</span><h2>Questions.<br />Answered.</h2></div>
            <div className="nx-faq">{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
          </div>
        </section>

        <section className="nx-ivory nx-sec nx-final">
          <div className="nx-wrap">
            <h2>A Private Conversation.</h2>
            <p className="nx-muted">If you own a qualifying asset or are looking to acquire one discreetly, begin your conversation with Eliteoz.</p>
            <div className="nx-ctas nx-center"><Link to="/register" className="nx-btn">Become a Member →</Link><Link to="/contact" className="nx-btn-ghost nx-ghost-dark">Contact Eliteoz →</Link></div>
          </div>
        </section>

        <section className="nx-dark nx-sec">
          <div className="nx-wrap nx-contact">
            <div><span className="nx-eyebrow">Contact</span><h2>ELITEOZ</h2></div>
            <address><strong>Registered Address</strong>3/4/28, Gopi Nath Bazar,<br />Delhi Cantt,<br />New Delhi — PIN 110010</address>
            <address><strong>Head Office</strong>14 School Lane,<br />Barakhamba Avenue,<br />Connaught Place,<br />New Delhi — PIN 110001</address>
            <address><strong>Email</strong><a href="mailto:privacy@eliteoz.com">privacy@eliteoz.com</a><a href="mailto:satish@eliteoz.com">satish@eliteoz.com</a><strong className="nx-mt">Phone</strong><a href="tel:+919315089933">9315089933</a></address>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
