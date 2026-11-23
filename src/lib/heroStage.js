/** what the hero and pet look like right now: outfit stage (1–6, from the rank), worn skin, pet growth (1–3) */
let heroStage = 1, heroSkin = null, petStage = 1
export const setHeroStage = (n) => { heroStage = Math.max(1, Math.min(6, n || 1)) }
export const setHeroSkin = (id) => { heroSkin = id || null }
export const setPetStage = (n) => { petStage = Math.max(1, Math.min(3, n || 1)) }
/** 'hero_idle' → the worn skin's sheet, else this rank's outfit sheet */
export const heroSheet = (name) => (!name.startsWith('hero_') ? name : heroSkin ? `${heroSkin}_${name.slice(5)}` : heroStage > 1 ? `hero${heroStage}_${name.slice(5)}` : name)
/** 'pet_fox' → 'pet_fox_2' / 'pet_fox_3' as the pet grows */
export const petSprite = (name) => (petStage > 1 && /^pet_[a-z]+$/.test(name || '') ? `${name}_${petStage}` : name)
