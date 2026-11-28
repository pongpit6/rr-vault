export const TOPICS = [
  ['work', 'งาน'],
  ['money', 'เงิน'],
  ['love', 'ความรัก'],
  ['health', 'สุขภาพ'],
]

export const topicRows = (entries) => TOPICS.map(([id, label], index) => {
  const [headline, advice, reason] = entries[index]
  return { id, label, headline, advice, reason }
})
