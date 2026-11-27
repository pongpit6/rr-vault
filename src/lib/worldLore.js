import entries from './worldLore.json'

// Read-only story lookup. No save state, unlock rules or gameplay effects.
export const WORLD_LORE = entries
export function loreOf(category, id) {
  if (id == null) return null
  const key = String(id)
  if (category === 'skins' && /^bday_\d+$/.test(key)) return entries.skins.birthday
  if (!Object.hasOwn(entries, category)) return null
  return Object.hasOwn(entries[category], key) ? entries[category][key] : null
}
