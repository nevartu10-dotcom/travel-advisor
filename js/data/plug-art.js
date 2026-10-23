// Front-view diagrams of plug types A–O (pins facing you). Illustrative, not to scale.
// Body outlines use "pa-body", metal pins "pa-pin", holes "pa-hole".

const R = (x, y, w, h, extra = '') => `<rect class="pa-pin" x="${x}" y="${y}" width="${w}" height="${h}" rx="1" ${extra}/>`;
const P = (cx, cy, r = 3) => `<circle class="pa-pin" cx="${cx}" cy="${cy}" r="${r}"/>`;
const roundBody = '<circle class="pa-body" cx="32" cy="32" r="25"/>';
const rot = (deg, cx, cy) => `transform="rotate(${deg} ${cx} ${cy})"`;

const ART = {
  A: `<rect class="pa-body" x="10" y="14" width="44" height="36" rx="8"/>${R(20, 25, 4, 14)}${R(40, 25, 4, 14)}`,
  B: `<rect class="pa-body" x="10" y="12" width="44" height="40" rx="8"/>${R(20, 19, 4, 13)}${R(40, 19, 4, 13)}${P(32, 42, 3.5)}`,
  C: `<rect class="pa-body" x="5" y="20" width="54" height="24" rx="12"/>${P(22, 32)}${P(42, 32)}`,
  D: `${roundBody}${P(32, 19, 4.5)}${P(21, 40)}${P(43, 40)}`,
  E: `${roundBody}${P(21, 34)}${P(43, 34)}<circle class="pa-hole" cx="32" cy="19" r="3.5"/>`,
  F: `${roundBody}${P(20, 32)}${P(44, 32)}${R(28, 6, 8, 4)}${R(28, 54, 8, 4)}`,
  G: `<rect class="pa-body" x="8" y="8" width="48" height="48" rx="6"/>${R(29, 14, 6, 14)}${R(14, 38, 13, 6)}${R(37, 38, 13, 6)}`,
  H: `${roundBody}${R(30, 13, 4, 12)}${R(19, 34, 4, 12, rot(30, 21, 40))}${R(41, 34, 4, 12, rot(-30, 43, 40))}`,
  I: `<rect class="pa-body" x="8" y="10" width="48" height="44" rx="10"/>${R(19, 17, 4, 14, rot(30, 21, 24))}${R(41, 17, 4, 14, rot(-30, 43, 24))}${R(30, 37, 4, 12)}`,
  J: `<path class="pa-body" d="M14 17H50L57 30L45 50H19L7 30Z"/>${P(19, 29)}${P(45, 29)}${P(32, 40)}`,
  K: `${roundBody}${P(20, 28)}${P(44, 28)}<path class="pa-pin" d="M27 39h10v2a5 5 0 0 1-10 0Z"/>`,
  L: `<rect class="pa-body" x="4" y="21" width="56" height="22" rx="11"/>${P(17, 32)}${P(32, 32)}${P(47, 32)}`,
  M: `${roundBody}${P(32, 18, 5.5)}${P(20, 40, 4)}${P(44, 40, 4)}`,
  N: `<path class="pa-body" d="M18 13H46L57 32L46 51H18L7 32Z"/>${P(19, 35)}${P(45, 35)}${P(32, 25)}`,
  O: `${roundBody}${P(20, 29)}${P(44, 29)}${P(32, 42)}`,
};

export function plugArt(type) {
  const inner = ART[type];
  if (!inner) return `<span class="plug-fallback" aria-hidden="true">${type}</span>`;
  return `<svg class="plug-art" viewBox="0 0 64 64" role="img" aria-label="Type ${type} plug, front view">${inner}</svg>`;
}
