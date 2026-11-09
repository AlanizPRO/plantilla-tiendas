// Fondos de temporada para el catálogo en línea. El dueño elige uno en Ajustes, o "Automático" según la fecha.

export type Tema = { id: string; nombre: string; mensaje: string; fondo: string; desde?: [number, number]; hasta?: [number, number] }

// Dibujo que se repite en el fondo (emojis en un SVG, sin imágenes externas).
const patron = (a: string, b: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><g opacity='0.32' font-size='30'><text x='14' y='44'>${a}</text><text x='84' y='114'>${b}</text></g></svg>`)}")`

export const TEMAS: Tema[] = [
  { id: 'navidad', nombre: 'Navidad', mensaje: '¡Feliz Navidad! Regala un reloj esta temporada 🎄', desde: [12, 1], hasta: [1, 6],
    fondo: `${patron('❄️', '⭐')}, linear-gradient(160deg, #7a0f1a 0%, #b3121f 45%, #0f5132 100%)` },
  { id: 'sanvalentin', nombre: 'San Valentín', mensaje: 'Regala tiempo a quien amas ❤️', desde: [2, 1], hasta: [2, 14],
    fondo: `${patron('❤️', '💕')}, linear-gradient(160deg, #ff8fab 0%, #e63462 55%, #9d0b3a 100%)` },
  { id: 'madre', nombre: 'Día de las Madres', mensaje: 'Para la mejor mamá 💐', desde: [5, 15], hasta: [5, 30],
    fondo: `${patron('🌸', '💐')}, linear-gradient(160deg, #fbe3ec 0%, #f4a6c1 50%, #c9a7eb 100%)` },
  { id: 'padre', nombre: 'Día del Padre', mensaje: 'Feliz Día del Padre ⌚', desde: [6, 10], hasta: [6, 23],
    fondo: `${patron('👔', '⭐')}, linear-gradient(160deg, #0b2545 0%, #13315c 50%, #1d6fa3 100%)` },
  { id: 'patrias', nombre: 'Fiestas Patrias', mensaje: '¡Viva Nicaragua! 🇳🇮', desde: [9, 1], hasta: [9, 15],
    fondo: `${patron('🇳🇮', '⭐')}, linear-gradient(180deg, #0067c6 0%, #0067c6 30%, #ffffff 30%, #ffffff 70%, #0067c6 70%)` },
  { id: 'blackfriday', nombre: 'Black Friday', mensaje: 'Black Friday: precios especiales ⚡', desde: [11, 20], hasta: [11, 30],
    fondo: `${patron('⚡', '🏷️')}, linear-gradient(160deg, #000000 0%, #1c1c1c 60%, #b8860b 100%)` },
]

const dentro = (hoy: Date, t: Tema) => {
  if (!t.desde || !t.hasta) return false
  const n = (hoy.getMonth() + 1) * 100 + hoy.getDate()
  const a = t.desde[0] * 100 + t.desde[1], b = t.hasta[0] * 100 + t.hasta[1]
  return a <= b ? n >= a && n <= b : n >= a || n <= b // Navidad cruza el año
}

/** El tema a mostrar: el elegido, o el de la fecha si es "auto". Sin tema = null. */
export function temaActual(elegido: string | undefined, hoy = new Date()): Tema | null {
  if (!elegido || elegido === 'ninguno') return null
  if (elegido === 'auto') return TEMAS.find((t) => dentro(hoy, t)) ?? null
  return TEMAS.find((t) => t.id === elegido) ?? null
}

export const fechasTema = (t: Tema) => t.desde && t.hasta ? `${t.desde[1]}/${t.desde[0]} al ${t.hasta[1]}/${t.hasta[0]}` : ''
