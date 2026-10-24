// Our own app artwork, as SVG strings: dark-green felt, a fanned Ace + King and a casino chip. No third-party assets.
const HEART = 'M50 90 C10 60 0 35 20 18 C35 6 50 18 50 30 C50 18 65 6 80 18 C100 35 90 60 50 90 Z';
const SPADE = 'M50 8 C10 40 0 65 20 82 C35 94 50 82 50 70 C50 82 65 94 80 82 C100 65 90 40 50 8 Z M50 66 L36 98 L64 98 Z';

const card = (cx, cy, rot, rank, suitPath, color) => `
  <g transform="translate(${cx} ${cy}) rotate(${rot})" filter="url(#drop)">
    <rect x="-165" y="-235" width="330" height="470" rx="38" fill="#f8f6ef"/>
    <rect x="-165" y="-235" width="330" height="470" rx="38" fill="none" stroke="#d9d4c4" stroke-width="3"/>
    <text x="-132" y="-160" font-family="Georgia, 'DejaVu Serif', serif" font-weight="700" font-size="92" fill="${color}">${rank}</text>
    <g transform="translate(-138 -140) scale(.62)" fill="${color}"><path d="${suitPath}"/></g>
    <g transform="translate(-85 -70) scale(1.7)" fill="${color}"><path d="${suitPath}"/></g>
  </g>`;

const chip = (cx, cy, r) => {
  const segs = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `<rect x="${-r * 0.16}" y="${-r}" width="${r * 0.32}" height="${r * 0.2}" rx="6" fill="#fff" transform="rotate(${(a * 180) / Math.PI})"/>`;
  }).join('');
  return `<g transform="translate(${cx} ${cy})" filter="url(#drop)">
    <circle r="${r}" fill="#b71c1c"/>
    ${segs}
    <circle r="${r * 0.78}" fill="none" stroke="#fff" stroke-width="7" opacity=".9"/>
    <circle r="${r * 0.74}" fill="#8e1515"/>
    <circle r="${r * 0.52}" fill="none" stroke="#e7c35a" stroke-width="6"/>
    <g transform="translate(${-r * 0.3} ${-r * 0.32}) scale(${r * 0.006})" fill="#e7c35a"><path d="${SPADE}"/></g>
  </g>`;
};

/** Content only (no background), designed on a 1024 canvas. */
export const motif = () => `
  ${card(420, 470, -15, 'A', SPADE, '#16181c')}
  ${card(585, 450, 11, 'K', HEART, '#c0262d')}
  ${chip(655, 745, 170)}`;

export const felt = (w, h) => `
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#17664a"/><stop offset=".6" stop-color="#0d4130"/><stop offset="1" stop-color="#062619"/></radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0"/></filter>
    <filter id="drop" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity=".5"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" filter="url(#grain)" opacity=".07"/>`;

/** Square app icon. `inset` scales the motif toward the centre (maskable icons need a safe zone). */
export function iconSvg(size = 1024, inset = 1) {
  const k = (size / 1024) * inset;
  const o = (size - 1024 * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${felt(size, size)}
  <g transform="translate(${o} ${o - 20 * k}) scale(${k})">${motif()}</g></svg>`;
}

/** Launch image: felt with the motif centred small enough to survive aspect-fill cropping to a portrait phone. */
export function splashSvg(size = 2732) {
  const k = 0.95;
  const o = (size - 1024 * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${felt(size, size)}
  <g transform="translate(${o} ${o}) scale(${k})">${motif()}</g></svg>`;
}
