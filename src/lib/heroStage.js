/** which outfit the hero wears (1–6, from the rank); 'hero_*' sheets resolve to that outfit */
let heroStage = 1
export const setHeroStage = (n) => { heroStage = Math.max(1, Math.min(6, n || 1)) }
export const heroSheet = (name) => (heroStage > 1 && name.startsWith('hero_') ? `hero${heroStage}_${name.slice(5)}` : name)
