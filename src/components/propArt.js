import { still } from './BattleScene'
/** draw a PixelLab town prop (32×32 sprite, feet at the bottom) with its feet at (x, y), `size` units square; false while it loads */
export function prop(g, name, x, y, size, flip = false) {
  const im = still(name)
  if (!im) return false
  if (flip) { g.save(); g.translate(Math.round(x) + size, 0); g.scale(-1, 1); g.drawImage(im, 0, Math.round(y - size), size, size); g.restore() } else g.drawImage(im, Math.round(x), Math.round(y - size), size, size)
  return true
}
;['pr_gate', 'pr_plot', 'pr_flag_s', 'pr_flag_g', 'pr_flag_p', 'pr_flag_y', 'pr_gtree_s', 'pr_gtree_l', 'pr_bunting', 'pr_salecart', 'pr_tower_r', 'pr_tower_o', 'pr_lantern_r', 'pr_lantern_y', 'pr_lights', 'pr_xmas', 'pr_candle', 'pr_stall', 'pr_krathong',
  'pr_dumbbell', 'pr_books', 'pr_incense', 'pr_chalk', 'pr_vegbasket', 'pr_piggy', 'pr_swordstone', 'pr_pennant', 'pr_lamp_r', 'pr_page', 'pr_balloon', 'pr_coins', 'pr_cup'].forEach(still)
