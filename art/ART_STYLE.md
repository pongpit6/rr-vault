# LifeQuest art style (PixelLab)

Every new picture must match these references, so the game looks like one world.

## Characters, monsters, NPCs, pets
- Reference: `art/style/character_ref.png` (the hero, 64×64).
- Look: chunky proportions, thick near-black outline, flat simple shading, medium saturation, side view.
- Make with `generate-image-v2`: pass the reference as BOTH `style_image` and a `reference_images` entry
  ("match exactly this art style: same outline, shading, pixel size, saturation; only the subject changes").
  Do NOT pass older sprites as references (they pull the result back to the old anime style).
- Party/NPC 64×64 facing right; bosses 80×80 (flip to face left in code); pets 32×32.
- Animation: `animate-with-text-v3` from the chosen still (idle 4 frames, attack 8 frames; result has +1 frame).

## Icons
- References: `art/style/icon_ref_*.png` (32×32). Dark navy outline, basic shading, soft colours.
- Make with `generate-with-style-v2` and a list "a different item in every cell: …" → 16 items × 4 variants per call.

## Buildings and town
- Reference: `art/style/building_ref.png` (64×64); scenes use the backdrops in `public/sprites/town_*.png`, `pg_*.png`.

## Never
- Asset brand logos (BTC, stocks, banks) stay as they are.
- The PixelLab key is never committed.
