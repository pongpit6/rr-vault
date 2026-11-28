export default function ReadingTopics({ rows, testid = 'reading-topics' }) {
  return (
    <dl className="divide-y divide-slate-200" data-testid={testid}>
      {rows.map(({ id, label, headline, advice, reason }) => (
        <div key={id} className="min-w-0 py-2.5 first:pt-0 last:pb-0" data-topic={id}>
          <dt className="text-sm font-semibold leading-snug"><span className="text-teal-700">{label}</span> · {headline}</dt>
          <dd className="mt-1 text-sm leading-relaxed break-words">{advice}</dd>
          {reason && <dd className="mt-1 text-xs leading-relaxed text-slate-500 break-words">{reason}</dd>}
        </div>
      ))}
    </dl>
  )
}
