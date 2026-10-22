import { useState } from 'react';
import { FileText, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { armaniDrafts, armaniReport, filterArmaniDrafts, type ArmaniDraft } from '@/lib/armani-drafts';
import reportAsset from '@/assets/armani-availability.pdf.asset.json';

const price = (value: number) => `AED ${value.toLocaleString('en-US')}`;

export function ArmaniPreviewDrafts() {
  const [drafts, setDrafts] = useState(armaniDrafts);
  const [query, setQuery] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [selected, setSelected] = useState<ArmaniDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const list = filterArmaniDrafts(drafts, query, bedrooms);
  return <section className="mb-8 min-w-0" aria-label="Armani imported preview drafts">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><span className="eyebrow">MASTER ADMIN · PDF DRAFTS</span><h2 className="break-words text-2xl">{armaniReport.project}</h2><p className="mt-2 text-sm">{armaniReport.location} · {drafts.length} units · Global · AED</p></div>
      <Button asChild variant="outline" size="sm"><a href={reportAsset.url} target="_blank" rel="noopener noreferrer"><FileText size={15} /> Source PDF</a></Button>
    </div>
    <div className="alert-band"><div><strong>Preview drafts only — not published or verified.</strong><p>Report dated {armaniReport.reportDate}; availability and prices require reconfirmation. Anticipated completion: 31 December 2027. Photographs, floor plans, bathrooms and ownership documents were not supplied.</p></div></div>
    <div className="toolbar wrap">
      <input className="field-input" aria-label="Search Armani unit" placeholder="Search unit number" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select className="field-input" aria-label="Armani bedrooms" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)}><option value="">All bedrooms</option>{[2, 3, 4, 5].map((count) => <option key={count} value={count}>{count} bedrooms</option>)}</select>
      <span className="text-sm">{list.length} of {drafts.length} units</span>
    </div>
    <div className="data-table-wrap"><table className="data-table"><thead><tr>{['Unit', 'Bedrooms / layout', 'Sea view', 'Area (sq.ft)', 'Selling price', 'Status', 'Actions'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{list.map((draft) => <tr key={draft.unit}>
      <td><strong>{draft.unit}</strong></td><td>{draft.bedrooms} BR · {draft.layout}</td><td>Sea View</td><td>{draft.areaSqft.toLocaleString('en-US')}</td><td className="whitespace-nowrap">{price(draft.priceAed)}</td><td><span className="status draft">Preview draft</span></td>
      <td><div className="row-actions"><Button size="sm" variant="outline" aria-label={`View ${draft.unit}`} onClick={() => { setSelected(draft); setEditing(false); }}><Eye size={14} /> View</Button><Button size="sm" variant="ghost" aria-label={`Edit ${draft.unit} preview`} onClick={() => { setSelected(draft); setEditing(true); }}><Pencil size={14} /> Edit preview</Button></div></td>
    </tr>)}</tbody></table>{!list.length && <p className="empty-state">No units match these filters.</p>}</div>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto"><DialogHeader><DialogTitle>{selected?.unit}</DialogTitle><DialogDescription>{armaniReport.project} · Preview draft, not a live listing</DialogDescription></DialogHeader>
      {selected && (editing ? <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const updated = { ...selected, priceAed: Number(form.get('price')), areaSqft: Number(form.get('area')) }; setDrafts((current) => current.map((draft) => draft.unit === selected.unit ? updated : draft)); setSelected(null); }}>
        <div className="field"><label htmlFor="armani-price">Selling price (AED)</label><input id="armani-price" name="price" type="number" min="1" step="1" required className="field-input" defaultValue={selected.priceAed} /></div>
        <div className="field"><label htmlFor="armani-area">Saleable area (sq.ft)</label><input id="armani-area" name="area" type="number" min="1" step="1" required className="field-input" defaultValue={selected.areaSqft} /></div>
        <p className="my-3 text-sm">Changes apply to this preview session only. No live listing is saved or published.</p><Button type="submit">Apply preview changes</Button>
      </form> : <dl className="grid grid-cols-2 gap-4 text-sm">{[['Location', armaniReport.location], ['Bedrooms / layout', `${selected.bedrooms} BR · ${selected.layout}`], ['View', 'Sea View'], ['Saleable area', `${selected.areaSqft.toLocaleString('en-US')} sq.ft`], ['Selling price', price(selected.priceAed)], ['Anticipated completion', '31 December 2027'], ['Source', `Master Admin · Report ${armaniReport.reportDate}`], ['Verification', 'Not verified · Subject to availability']].map(([label, value]) => <div key={label} className="min-w-0"><dt>{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}</dl>)}
    </DialogContent></Dialog>
  </section>;
}