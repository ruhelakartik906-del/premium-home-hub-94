import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell, PropertyCard, SearchBar } from '@/components/eliteoz';
import { publicPropertiesQuery, readCompare, toggleCompare } from '@/lib/queries';

export const Route = createFileRoute('/properties/')({
  validateSearch: z.object({ category: z.string().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicPropertiesQuery),
  head: () => ({ meta: [{ title: 'Explore Properties | ELITEOZ' }, { name: 'description', content: 'Explore curated and verified high-value properties on Eliteoz.' }, { property: 'og:title', content: 'Explore Properties | ELITEOZ' }, { property: 'og:description', content: 'Explore curated and verified high-value properties on Eliteoz.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  errorComponent: () => <PageShell><div className="section container"><h2>Properties could not be loaded.</h2><p>Please refresh the page.</p></div></PageShell>,
  component: Properties,
});

function Properties() {
  const { category: initial } = Route.useSearch();
  const { data } = useSuspenseQuery(publicPropertiesQuery);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initial ?? '');
  const [types, setTypes] = useState<string[]>([]);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sort, setSort] = useState('Featured');
  const [drawer, setDrawer] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  useEffect(() => setCompare(readCompare()), []);
  const allTypes = [...new Set(data.listings.map((l) => l.type))];
  const filtered = useMemo(() => {
    let list = data.listings.filter((p) => (!category || p.category === category) && (!types.length || types.includes(p.type)) && (!featuredOnly || p.featured) && `${p.name} ${p.location} ${p.type}`.toLowerCase().includes(query.toLowerCase()));
    if (sort === 'Price: low to high') list = [...list].sort((a, b) => a.priceValue - b.priceValue);
    if (sort === 'Price: high to low') list = [...list].sort((a, b) => b.priceValue - a.priceValue);
    return list;
  }, [data, query, category, types, featuredOnly, sort]);
  const clear = () => { setCategory(''); setQuery(''); setTypes([]); setFeaturedOnly(false); };
  return <PageShell><main>
    <section className="page-hero"><div className="container"><span className="eyebrow">THE COLLECTION</span><h1>Discover exceptional properties.</h1><p>Curated, verified opportunities for a more considered real estate journey.</p><div style={{ maxWidth: 700, marginTop: 28 }}><SearchBar onSearch={setQuery} /></div></div></section>
    <section className="section container"><div className="market-layout">
      <aside className={`filters ${drawer ? 'open' : ''}`}>
        <div className="panel-head"><h3>Refine your search</h3><Button variant="ghost" size="icon" className="filter-toggle" onClick={() => setDrawer(false)} aria-label="Close filters"><X /></Button></div>
        <div className="filter-group"><label htmlFor="category">PROPERTY CATEGORY</label><select id="category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{data.categories.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="filter-group"><label>PROPERTY TYPE</label>{allTypes.map((x) => <label key={x} className="filter-check"><input type="checkbox" checked={types.includes(x)} onChange={() => setTypes((v) => v.includes(x) ? v.filter((t) => t !== x) : [...v, x])} /> {x}</label>)}</div>
        <div className="filter-group"><label>MORE FILTERS</label><label className="filter-check"><input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} /> Featured only</label></div>
        <Button variant="outline" onClick={clear}>Clear filters</Button><Button className="filter-toggle" onClick={() => setDrawer(false)}>View properties</Button>
      </aside>
      <div>
        <div className="results-top"><span>{filtered.length} exceptional {filtered.length === 1 ? 'property' : 'properties'}</span><div className="flex items-center gap-3"><Button variant="outline" size="sm" className="filter-toggle" onClick={() => setDrawer(true)}><SlidersHorizontal /> Filters</Button><select aria-label="Sort properties" value={sort} onChange={(e) => setSort(e.target.value)}>{['Featured', 'Price: low to high', 'Price: high to low'].map((x) => <option key={x}>{x}</option>)}</select></div></div>
        {filtered.length ? <div className="property-grid market-grid">{filtered.map((p) => <PropertyCard key={p.id} property={p} compared={compare.includes(p.id)} onCompare={(id) => setCompare(toggleCompare(id))} />)}</div> : <div className="empty-state"><h3>No properties found.</h3><p>Try another location or category.</p><Button variant="outline" onClick={clear}>Clear filters</Button></div>}
        {compare.length > 0 && <div className="notice mt-6">{compare.length} selected for comparison (up to 4). <Button variant="link" asChild><Link to="/buyer/$section" params={{ section: 'compare' }}>Open comparison <ArrowUpRight /></Link></Button></div>}
      </div>
    </div></section>
  </main></PageShell>;
}
