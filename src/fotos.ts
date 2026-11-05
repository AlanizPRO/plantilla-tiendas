// Achica las fotos en el teléfono antes de guardarlas. Así caben en la base de datos del plan gratis (Spark),
// sin pagar almacenamiento: foto grande ~120 KB y miniatura ~10 KB.

function cargar(archivo: File): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); ok(img) }
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No pude abrir esa foto.')) }
    img.src = url
  })
}

type Fuente = HTMLImageElement | HTMLCanvasElement

function dibujar(img: Fuente, lado: number, cuadrada: boolean) {
  const lienzo = document.createElement('canvas')
  const escala = Math.min(1, lado / Math.max(img.width, img.height))
  if (cuadrada) {
    const s = Math.min(img.width, img.height)
    lienzo.width = lienzo.height = Math.min(lado, s)
    lienzo.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, lienzo.width, lienzo.height)
  } else {
    lienzo.width = Math.round(img.width * escala)
    lienzo.height = Math.round(img.height * escala)
    lienzo.getContext('2d')!.drawImage(img, 0, 0, lienzo.width, lienzo.height)
  }
  return lienzo
}

// Baja la calidad hasta que la foto pese menos del máximo.
function comprimir(lienzo: HTMLCanvasElement, maxBytes: number, inicial = 0.82) {
  let calidad = inicial
  let datos = lienzo.toDataURL('image/jpeg', calidad)
  while (datos.length * 0.75 > maxBytes && calidad > 0.35) {
    calidad -= 0.08
    datos = lienzo.toDataURL('image/jpeg', calidad)
  }
  return datos
}

// Quita las franjas blancas o grises que rodean al reloj (fondo de la caja o de la mesa),
// para que el reloj llene el cuadro de la app. Si no está claro dónde termina el reloj, deja la foto igual.
function recortarFondo(img: HTMLImageElement): Fuente {
  const lado = 160
  const esc = Math.min(1, lado / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * esc))
  const h = Math.max(1, Math.round(img.height * esc))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(img, 0, 0, w, h)
  const datos = g.getImageData(0, 0, w, h).data
  // Fondo = pixel casi blanco o gris muy claro y poco color.
  const fondo = (i: number) => {
    const r = datos[i], gr = datos[i + 1], b = datos[i + 2]
    const max = Math.max(r, gr, b), min = Math.min(r, gr, b)
    return min >= 205 && max - min <= 28
  }
  let x0 = w, x1 = -1, y0 = h, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (fondo((y * w + x) * 4)) continue
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  if (x1 < 0) return img
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1
  // Solo recorta si el reloj ocupa una parte clara de la foto (si es todo fondo, no tocar).
  if (bw * bh > w * h * 0.85 || bw * bh < w * h * 0.08) return img
  const margen = 0.04
  const sx = Math.max(0, Math.floor((x0 - bw * margen) / w * img.width))
  const sy = Math.max(0, Math.floor((y0 - bh * margen) / h * img.height))
  const ex = Math.min(img.width, Math.ceil((x1 + 1 + bw * margen) / w * img.width))
  const ey = Math.min(img.height, Math.ceil((y1 + 1 + bh * margen) / h * img.height))
  const r = document.createElement('canvas')
  r.width = ex - sx; r.height = ey - sy
  r.getContext('2d')!.drawImage(img, sx, sy, ex - sx, ey - sy, 0, 0, r.width, r.height)
  return r
}

// Calidad de las fotos nuevas, en KB (Ajustes → Calidad de las fotos). Cada foto va en su propio registro
// de la base de datos (máximo 1 MB), así que no pasa de 500 KB. Más KB = menos fotos caben en el plan gratis.
export const CALIDADES_FOTO: [number, string][] = [
  [150, 'Normal · 150 KB (caben unas 6,500 fotos en el plan gratis)'],
  [300, 'Alta · 300 KB (unas 2,600 fotos)'],
  [500, 'Muy alta · 500 KB (unas 1,600 fotos)'],
]
export const CALIDAD_FOTO_INICIAL = 150
let kbFoto = CALIDAD_FOTO_INICIAL
export function ponerCalidadFotos(kb?: number) {
  kbFoto = Math.min(500, Math.max(100, Number(kb) || CALIDAD_FOTO_INICIAL))
}

export async function prepararFoto(archivo: File) {
  const img = await cargar(archivo)
  const sinFondo = recortarFondo(img)
  // Con más KB también se guarda más grande (más detalle al hacer zoom).
  let lado = kbFoto >= 400 ? 2000 : kbFoto >= 250 ? 1600 : 1100
  let grande = comprimir(dibujar(sinFondo, lado, false), kbFoto * 1000, kbFoto >= 250 ? 0.9 : 0.82)
  // Si aun con menos calidad pesa demasiado, se achica la foto hasta que quepa.
  while (grande.length * 0.75 > kbFoto * 1000 && lado > 600) {
    lado = Math.round(lado * 0.8)
    grande = comprimir(dibujar(sinFondo, lado, false), kbFoto * 1000)
  }
  return {
    grande,
    miniatura: comprimir(dibujar(sinFondo, 220, true), 14_000),
  }
}
