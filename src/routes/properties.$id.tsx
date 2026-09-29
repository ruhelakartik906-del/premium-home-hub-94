import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, BadgeCheck, MapPin, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Notice, PageShell, PropertyCard } from '@/components/eliteoz';
import { publicPropertyQuery } from '@/lib/queries';
import { useMe } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { SaveButton } from '@/components/workspace-extra';

export const Route = createFileRoute('/properties/$id')({
  loader: async ({ context, params }) => { const d = await context.queryClient.ensureQueryData(publicPropertyQuery(params.id)); if (!d.listing) throw notFound(); return { name: d.listing.name, description: d.listing.description }; },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.name ?? 'Property'} | ELITEOZ` }, { name: 'description', content: loaderData?.description?.slice(0, 155) || `Explore ${loaderData?.name ?? 'an exceptional property'} on Eliteoz.` }, { property: 'og:title', content: `${loaderData?.name ?? 'Property'} | ELITEOZ` }, { property: 'og:description', content: loaderData?.description?.slice(0, 155) || 'Verified property on Eliteoz.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  notFoundComponent: () => <PageShell><div className="section container"><h2>Property not found.</h2><Link className="text-link" to="/properties">Back to all properties</Link></div></PageShell>,
  errorComponent: () => <PageShell><div className="section container"><h2>This property could not be loaded.</h2></div></PageShell>,
  component: Details,
});

function ContactForm({ propertyUuid, propertyName }: { propertyUuid: string; propertyName: string }) {
  const { data: me } = useMe();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (!me) return <div className="contact-card"><h3>Interested in this property?</h3><p>Log in as a buyer to send a contact request. Our team will reach out to you.</p><Button asChild><Link to="/login">Log in to contact</Link></Button><Button variant="outline" asChild><Link to="/register" search={{ role: 'buyer' }}>Become a buyer</Link></Button></div>;
  if (!me.roles.includes('buyer')) return <div className="contact-card"><p>Contact requests are available to buyer accounts.</p></div>;
  if (done) return <div className="contact-card"><BadgeCheck /><h3>Request received.</h3><p>The Eliteoz team will contact you shortly. You can follow it under My Interests.</p><Button asChild variant="outline"><Link to="/buyer/$section" params={{ section: 'interests' }}>View my interests</Link></Button></div>;
  const p = me.profile;
  return <form className="contact-card" onSubmit={async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true);
    const { error } = await supabase.from('interests').insert({ property_id: propertyUuid, buyer_id: me.user.id, name: String(f.get('name')).slice(0, 120), phone: String(f.get('phone')).slice(0, 20), email: String(f.get('email')).slice(0, 200), message: String(f.get('message') ?? '').slice(0, 1000), preferred_time: String(f.get('time') ?? '') });
    setBusy(false);
    if (error) toast.error('Could not send your request. Please try again.'); else { setDone(true); toast.success('Contact request sent'); }
  }}>
    <span className="eyebrow">CONTACT THE TEAM</span><h3>Enquire about {propertyName}</h3>
    <input className="field-input" name="name" required defaultValue={p?.full_name ?? ''} placeholder="Full name" />
    <input className="field-input" name="phone" required defaultValue={p?.mobile ?? ''} placeholder="Mobile number" />
    <input className="field-input" name="email" type="email" required defaultValue={p?.email ?? me.user.email ?? ''} placeholder="Email" />
    <select className="field-input" name="time" defaultValue="Anytime"><option>Anytime</option><option>Morning</option><option>Afternoon</option><option>Evening</option></select>
    <textarea className="field-input" name="message" rows={3} placeholder="Your message (optional)" />
    <Button type="submit" disabled={busy}><Send /> {busy ? 'Sending…' : 'Send contact request'}</Button>
  </form>;
}

function Details() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(publicPropertyQuery(id));
  const p = data.listing!;
  return <PageShell><main>
    <div className="container" style={{ paddingTop: 25, paddingBottom: 25 }}><Link className="text-link" to="/properties"><ArrowLeft size={15} /> All properties</Link></div>
    <div className="detail-gallery"><img src={p.image} alt={p.name} /><div className="detail-gallery-side"><img src={p.gallery[0] ?? p.image} alt="Property view" /><img src={p.gallery[1] ?? p.gallery[0] ?? p.image} alt="Property detail" /></div></div>
    {p.gallery.length > 2 && <div className="container detail-thumbs">{p.gallery.slice(2).map((g) => <a key={g} href={g} target="_blank" rel="noreferrer"><img src={g} alt="Property photo" /></a>)}</div>}
    <div className="section container detail-layout"><div>
      <span className="eyebrow">{p.category.toUpperCase()} / {p.id}</span><h1 className="detail-title">{p.name}</h1><p className="property-location"><MapPin size={15} />{p.location}</p>
      <div className="detail-stats">{[['TYPE', p.type], ['AREA', p.area], ['BEDROOMS', String(p.beds)], ['BATHROOMS', String(p.baths)]].map(([l, v]) => <div key={l}><span>{l}</span><strong>{v}</strong></div>)}</div>
      <div className="detail-block"><h2>About this property</h2><p>{p.description || 'Details will be shared by the Eliteoz team on request.'}</p></div>
      {p.amenities.length > 0 && <div className="detail-block"><h2>Amenities</h2><div className="amenities">{p.amenities.map((x) => <span key={x}>{x}</span>)}</div></div>}
      <Notice><strong>Eliteoz Verified Property.</strong> Private seller identity, bank and ownership documents are never displayed publicly.</Notice>
    </div>
    <aside className="detail-aside"><span className="eyebrow">ASKING PRICE</span><div className="price">{p.price}</div><p>{p.area} · {p.type}</p><div className="notice"><BadgeCheck size={17} /> Eliteoz verified property</div><SaveButton propertyUuid={p.uuid} /><ContactForm propertyUuid={p.uuid} propertyName={p.name} /></aside></div>
    {data.related.length > 0 && <section className="section section-alt"><div className="container"><h2 style={{ fontSize: 36 }}>You may also like</h2><div className="property-grid">{data.related.map((x) => <PropertyCard key={x.id} property={x} />)}</div></div></section>}
  </main></PageShell>;
}
