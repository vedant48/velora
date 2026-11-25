# Header port spec (from main 07:36, design-worker measured)
Apply when porting the PROVEN native header (fix b60d00d) onto design/apple-ui ONLY:
- Brand V tile: 34x34dp, border radius 9, gradient 150deg #E50914 -> #8f050d,
  centered white V 19pt weight 800, subtle red shadow (0,3,10) opacity 0.3, left inset 20dp.
  (Current asset's red mark occupies only ~53% of image vs full-bleed mock; outer frame already 34dp r9.)
- Profile avatar stays 62dp, no change.
- Do NOT restyle the standalone repair on main/fix branch - repair appearance stays separate.
- Design scrolled-Details status-area safety: needs runtime tap/pixel check in proof, code layering alone insufficient.
