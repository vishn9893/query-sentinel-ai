export default function InvestigationSummary({ summary, model }) {
  return (
    <section className="panel full-width">
      <h2>Investigation Summary</h2>
      <p className="muted">Model: {model || 'pending'}</p>
      <p>{summary || 'AI summary will appear here after a translation is generated.'}</p>
    </section>
  )
}
