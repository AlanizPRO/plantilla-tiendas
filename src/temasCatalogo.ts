// Fondos de temporada para el catálogo en línea. El dueño elige uno en Ajustes, o "Automático" según la fecha.
// Cada fondo es un dibujo (sin imágenes externas): degradado + luces suaves + adornos de línea fina.
// El dueño también puede subir su propia foto para cualquier tema (Ajustes → Catálogo en línea).

export type Colgante = 'esfera' | 'corazon' | 'flor' | 'estrella' | 'bandera' | 'etiqueta' | 'ninguno'

export type Tema = {
  id: string; nombre: string; titulo: string; mensaje: string
  desde?: [number, number]; hasta?: [number, number]
  fondo: string        // degradado y luces (no se repite)
  adornos: string      // dibujos de línea fina (se repiten en mosaico de 240 px)
  texto: string        // color de las letras sobre el fondo
  acento: string       // color de los precios y detalles
  colgante: Colgante   // adornos que cuelgan arriba de la portada
  colores: string[]    // colores de esos adornos
}

// Adornos de línea fina, en una caja de 40×40.
const ADORNOS = {
  copo: `<g fill='none' stroke-linecap='round'><path d='M20 3v34M5.3 11.5l29.4 17M5.3 28.5l29.4-17'/><path d='M15 6l5 4 5-4M15 34l5-4 5 4M4 16.5l6.5 1.5L8.5 11.5M36 23.5l-6.5-1.5 2 6.5M4 23.5l6.5-1.5-2 6.5M36 16.5l-6.5 1.5 2-6.5'/></g>`,
  estrella: `<path fill='none' stroke-linejoin='round' d='M20 4l4.6 9.9 10.9 1.2-8.1 7.4 2.3 10.7L20 27.8l-9.7 5.4 2.3-10.7-8.1-7.4 10.9-1.2z'/>`,
  destello: `<path stroke='none' d='M20 4c1.2 8.5 3.5 10.8 12 12-8.5 1.2-10.8 3.5-12 12-1.2-8.5-3.5-10.8-12-12 8.5-1.2 10.8-3.5 12-12z'/>`,
  corazon: `<path fill='none' stroke-linejoin='round' d='M20 33C7 24 4.5 16 9 11c3.6-4 8.8-2.6 11 1.6C22.2 8.4 27.4 7 31 11c4.5 5 2 13-11 22z'/>`,
  flor: `<g fill='none'><ellipse cx='20' cy='11' rx='4.5' ry='7.5'/><ellipse cx='20' cy='11' rx='4.5' ry='7.5' transform='rotate(72 20 20)'/><ellipse cx='20' cy='11' rx='4.5' ry='7.5' transform='rotate(144 20 20)'/><ellipse cx='20' cy='11' rx='4.5' ry='7.5' transform='rotate(216 20 20)'/><ellipse cx='20' cy='11' rx='4.5' ry='7.5' transform='rotate(288 20 20)'/><circle cx='20' cy='20' r='3'/></g>`,
  reloj: `<g fill='none' stroke-linecap='round'><circle cx='20' cy='20' r='10.5'/><circle cx='20' cy='20' r='7.5' opacity='.5'/><path d='M20 14.5V20l3.8 2.6M15.5 9.8l1.3-6h6.4l1.3 6M15.5 30.2l1.3 6h6.4l1.3-6'/></g>`,
  etiqueta: `<g fill='none' stroke-linejoin='round'><path d='M5 21L19 7h15v15L20 36z'/><circle cx='28' cy='13' r='2.6'/></g>`,
}
type Adorno = keyof typeof ADORNOS

// Mosaico de 240×240 con adornos de varios tamaños y giros, para que no se vea repetido.
function patron(color: string, a: Adorno, b: Adorno, opacidad = 0.38) {
  const pon = (n: Adorno, x: number, y: number, s: number, r: number, o = 1) =>
    `<g transform='translate(${x} ${y}) rotate(${r} 20 20) scale(${s})' opacity='${o}'>${ADORNOS[n]}</g>`
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><g stroke='${color}' fill='${color}' stroke-width='1.3' opacity='${opacidad}'>`
    + pon(a, 18, 16, 1.25, -12) + pon(b, 150, 34, 0.8, 10) + pon('destello', 96, 112, 0.55, 0, 0.9)
    + pon(a, 160, 150, 0.95, 18, 0.8) + pon(b, 34, 170, 0.6, -20, 0.7) + pon('destello', 206, 98, 0.32, 0)
    + pon('destello', 70, 70, 0.25, 0) + `<circle cx='128' cy='208' r='1.6'/><circle cx='222' cy='14' r='1.2'/><circle cx='12' cy='110' r='1.4'/></g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// Luces desenfocadas (bokeh), como en una foto de vitrina.
const luces = (rgb: string[]) => [
  [12, 18, 22, .55], [85, 12, 16, .45], [70, 55, 26, .3], [8, 75, 18, .4], [92, 82, 24, .45], [40, 95, 14, .35], [55, 30, 9, .5],
].map(([x, y, r, o], i) => `radial-gradient(circle at ${x}% ${y}%, rgba(${rgb[i % rgb.length]},${o}) 0, rgba(${rgb[i % rgb.length]},0) ${r}%)`).join(', ')

const fondo = (color: string, a: Adorno, b: Adorno, rgb: string[], base: string, opacidad?: number) =>
  ({ fondo: `${luces(rgb)}, ${base}`, adornos: patron(color, a, b, opacidad) })

export const TEMAS: Tema[] = [
  { id: 'navidad', nombre: 'Navidad', titulo: 'Feliz Navidad', mensaje: 'Regala un reloj esta Navidad', desde: [12, 1], hasta: [1, 6],
    texto: '#fff6e0', acento: '#e2b84f', colgante: 'esfera', colores: ['#d4af37', '#c1121f', '#f4f1ea', '#1f7a4a', '#b8860b'],
    ...fondo('#f3d48a', 'copo', 'estrella', ['255,206,110', '255,120,110', '255,236,190'], 'linear-gradient(165deg, #2a060b 0%, #6d0f1c 38%, #8e1426 55%, #0c3a24 100%)') },
  { id: 'sanvalentin', nombre: 'San Valentín', titulo: 'San Valentín', mensaje: 'Regala tiempo a quien amas', desde: [2, 1], hasta: [2, 14],
    texto: '#fff0f4', acento: '#e63462', colgante: 'corazon', colores: ['#ff2e63', '#ffb3c6', '#ffffff', '#d90429', '#ff8fab'],
    ...fondo('#ffd6e0', 'corazon', 'destello', ['255,170,195', '255,90,130', '255,230,240'], 'linear-gradient(165deg, #3d0414 0%, #8a0f33 45%, #d6336c 100%)') },
  { id: 'madre', nombre: 'Día de las Madres', titulo: 'Feliz Día, Mamá', mensaje: 'Para la mejor mamá, un detalle que dura', desde: [5, 15], hasta: [5, 30],
    texto: '#5b1838', acento: '#a4245e', colgante: 'flor', colores: ['#f78fb3', '#ffffff', '#c39bd3', '#ffb5c9', '#e56b9b'],
    ...fondo('#ffffff', 'flor', 'corazon', ['255,255,255', '255,200,220', '220,190,255'], 'linear-gradient(165deg, #fff1f5 0%, #f9c6d8 45%, #d7bdf2 100%)', 0.6) },
  { id: 'padre', nombre: 'Día del Padre', titulo: 'Feliz Día, Papá', mensaje: 'El regalo que lo acompaña todos los días', desde: [6, 10], hasta: [6, 23],
    texto: '#eef5ff', acento: '#e9c46a', colgante: 'estrella', colores: ['#e9c46a', '#c0c7d1', '#ffffff', '#b8860b'],
    ...fondo('#a9cdf0', 'reloj', 'estrella', ['150,200,255', '233,196,106', '200,225,255'], 'linear-gradient(165deg, #050f1f 0%, #0d2a4d 50%, #17507f 100%)') },
  { id: 'patrias', nombre: 'Fiestas Patrias', titulo: '¡Viva Nicaragua!', mensaje: 'Celebra las fiestas patrias con estilo', desde: [9, 1], hasta: [9, 15],
    texto: '#ffffff', acento: '#ffd166', colgante: 'bandera', colores: ['#0067c6', '#ffffff'],
    ...fondo('#ffffff', 'estrella', 'destello', ['255,255,255', '120,190,255', '255,255,255'], 'linear-gradient(165deg, #002f6c 0%, #0060b8 50%, #3f95e6 100%)') },
  { id: 'blackfriday', nombre: 'Black Friday', titulo: 'Black Friday', mensaje: 'Precios especiales por pocos días', desde: [11, 20], hasta: [11, 30],
    texto: '#fbf3dc', acento: '#e2b84f', colgante: 'etiqueta', colores: ['#d4af37', '#1a1a1a', '#b8860b', '#f5e6b8'],
    ...fondo('#d4af37', 'etiqueta', 'reloj', ['212,175,55', '255,220,140', '120,90,20'], 'linear-gradient(165deg, #000000 0%, #121212 55%, #2b2108 100%)') },
  { id: 'propio', nombre: 'Mi foto (todo el año)', titulo: '', mensaje: 'Nuestra colección', colgante: 'ninguno', colores: [],
    texto: '#ffffff', acento: '#e2b84f',
    ...fondo('#e2b84f', 'reloj', 'destello', ['226,184,79', '255,255,255'], 'linear-gradient(165deg, #0b0b0b 0%, #1f1f1f 60%, #3a2c0a 100%)', 0.25) },
]

const dentro = (hoy: Date, t: Tema) => {
  if (!t.desde || !t.hasta) return false
  const n = (hoy.getMonth() + 1) * 100 + hoy.getDate()
  const a = t.desde[0] * 100 + t.desde[1], b = t.hasta[0] * 100 + t.hasta[1]
  return a <= b ? n >= a && n <= b : n >= a || n <= b // Navidad cruza el año
}

/** El tema a mostrar: el elegido, o el de la fecha si es "auto" (si no hay fecha especial y subiste "Mi foto", esa). */
export function temaActual(elegido: string | undefined, hoy = new Date(), conFotoPropia = false): Tema | null {
  if (!elegido || elegido === 'ninguno') return null
  if (elegido === 'auto') return TEMAS.find((t) => dentro(hoy, t)) ?? (conFotoPropia ? TEMAS.find((t) => t.id === 'propio')! : null)
  return TEMAS.find((t) => t.id === elegido) ?? null
}

export const fechasTema = (t: Tema) => t.desde && t.hasta ? `${t.desde[1]}/${t.desde[0]} al ${t.hasta[1]}/${t.hasta[0]}` : ''
