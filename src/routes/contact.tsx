import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { NoirPage, noirMeta } from '@/components/noir-page';

export const Route = createFileRoute('/contact')({
  head: () => noirMeta('Contact Eliteoz | A private conversation', 'Reach Eliteoz in confidence. Offices in Delhi Cantt and Connaught Place, New Delhi.'),
  component: Contact,
});

function Contact() {
  const [note, setNote] = useState('');
  return (
    <NoirPage
      eyebrow="Contact"
      title="A Private Conversation."
      cta={false}
      sections={[
        { title: 'Email', body: <p><a href="mailto:Privacy@eliteoz.com">Privacy@eliteoz.com</a></p> },
        { title: 'Registered Address', body: <p>3/4/28, Gopi Nath Bazar,<br />Delhi Cantt,<br />New Delhi — 110010</p> },
        { title: 'Head Office', body: <p>14 School Lane,<br />Barakhamba Avenue, Connaught Place,<br />New Delhi — 110001</p> },
      ]}
    >
      <form className="nx-form" onSubmit={(e) => { e.preventDefault(); setNote('Messages cannot be sent from the website yet. Please write to Privacy@eliteoz.com.'); }}>
        <label>Name<input required autoComplete="name" /></label>
        <label>Email<input type="email" required autoComplete="email" /></label>
        <label>Mobile<input type="tel" required autoComplete="tel" /></label>
        <label>Subject<input required /></label>
        <label className="nx-full">Message<textarea rows={4} required /></label>
        <div className="nx-full"><button type="submit" className="nx-btn">Send Message</button>{note && <p className="nx-muted" role="status" style={{ marginTop: '1rem' }}>{note}</p>}</div>
      </form>
    </NoirPage>
  );
}
