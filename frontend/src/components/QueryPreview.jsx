export default function QueryPreview({ query }) {
  return (
    <section className="panel">
      <h2>Generated Query</h2>
      <pre className="code-block">{query || 'No query generated yet.'}</pre>
    </section>
  )
}
