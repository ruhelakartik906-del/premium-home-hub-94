import { TERMS_CLAUSES, TERMS_TITLE } from '@/lib/terms';

export function TermsPanel() {
  return <div className="panel" style={{ maxHeight: 240, overflowY: 'auto' }} aria-label={TERMS_TITLE}>
    <strong>{TERMS_TITLE}</strong>
    <ol style={{ listStyle: 'decimal', paddingLeft: '1.25rem', marginTop: '.75rem', display: 'grid', gap: '.6rem' }}>
      {TERMS_CLAUSES.map((c) => <li key={c}>{c}</li>)}
    </ol>
  </div>;
}
