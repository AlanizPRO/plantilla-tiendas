// Inventario que trajo el Excel del cliente (lo pone la Super App en src/cliente.json → "inventario").
// Se carga una sola vez, la primera vez que entra el dueño y si todavía no hay productos.
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { cliente } from './cliente'
import { type Ajustes, type Producto, type Vitrina } from './datos'
import { db } from './firebase'

type Articulo = { nombre?: string; precio?: number; cantidad?: number; estilo?: string; codigo?: string; ubicacion?: string }

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

export const inventarioInicial = (): Articulo[] => ((cliente as { inventario?: Articulo[] }).inventario ?? []).filter((a) => a?.nombre?.trim())

const copias = (a: Articulo) => Math.min(50, Math.max(1, Math.round(Number(a.cantidad) || 1)))

export async function cargarInventarioInicial(ajustes: Ajustes, vitrinas: Vitrina[]) {
  const lista = inventarioInicial()
  if (!lista.length) return 0
  const estilos = new Map(ajustes.estilos.map((e) => [normal(e), e]))
  // Cada reloj es una pieza que se mueve sola, así que "cantidad 3" crea 3 iguales.
  // Cada pieza tiene un id fijo (excel-fila-copia): si la app se abre en dos lugares a la vez, la segunda carga
  // escribe sobre las mismas piezas en vez de repetirlas.
  const piezas = lista.flatMap((a, fila) => Array.from({ length: copias(a) }, (_, k) => ({ a, id: `excel-${fila}-${k}` }))).slice(0, 2000)
  for (let i = 0; i < piezas.length; i += 400) {
    const lote = writeBatch(db)
    for (const { a, id } of piezas.slice(i, i + 400)) {
      const estilo = a.estilo ? estilos.get(normal(a.estilo)) : undefined
      const lugar = a.ubicacion ? vitrinas.find((v) => normal(v.nombre) === normal(a.ubicacion!)) : undefined
      lote.set(doc(db, 'productos', id), {
        marca: !estilo && a.estilo ? a.estilo.trim() : '', modelo: a.nombre!.trim(), codigo: (a.codigo ?? '').toString().trim(),
        estilo: estilo ?? '', material: '', color: '', descripcion: '', precio: Number(a.precio) || 0, fotos: [], miniatura: '',
        ...(lugar ? { estado: 'exhibicion', vitrinaId: lugar.id, segmento: lugar.segmentos[0] ?? '' } : { estado: 'bodega', vitrinaId: '', segmento: '' }),
        origen: 'excel', creado: serverTimestamp(), actualizado: serverTimestamp(),
      })
    }
    await lote.commit()
  }
  return piezas.length
}

export const marcarCargado = () => setDoc(doc(db, 'ajustes', 'general'), { inventarioCargado: true }, { merge: true })

// Si el Excel se cargó más de una vez: por cada fila del Excel deja solo las piezas que dice su cantidad.
// Solo cuenta piezas sin fotos que coinciden con la fila (nombre, código y precio); prefiere quitar las que siguen en bodega.
export function repetidosDelExcel(productos: Producto[]): Producto[] {
  // Filas iguales del Excel se suman (dos filas "Casio X" con cantidad 1 = 2 piezas).
  const esperadas = new Map<string, number>()
  const clave = (modelo: string, codigo: string, precio: number) => `${modelo.trim()}|${codigo.trim()}|${precio}`
  for (const a of inventarioInicial()) {
    const k = clave(a.nombre!, (a.codigo ?? '').toString(), Number(a.precio) || 0)
    esperadas.set(k, (esperadas.get(k) ?? 0) + copias(a))
  }
  const grupos = new Map<string, Producto[]>()
  for (const p of productos) {
    if (p.fotos?.length) continue
    const k = clave(p.modelo, p.codigo ?? '', p.precio)
    if (esperadas.has(k)) grupos.set(k, [...(grupos.get(k) ?? []), p])
  }
  const sobran: Producto[] = []
  for (const [k, iguales] of grupos) {
    const quedan = esperadas.get(k)!
    if (iguales.length <= quedan) continue
    const orden = [...iguales].sort((x, y) => Number(x.estado === 'bodega') - Number(y.estado === 'bodega'))
    sobran.push(...orden.slice(quedan))
  }
  return sobran
}

export async function quitarRepetidos(productos: Producto[]) {
  for (let i = 0; i < productos.length; i += 400) {
    const lote = writeBatch(db)
    for (const p of productos.slice(i, i + 400)) lote.delete(doc(db, 'productos', p.id))
    await lote.commit()
  }
  return productos.length
}
