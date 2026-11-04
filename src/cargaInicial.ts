// Inventario que trajo el Excel del cliente (lo pone la Super App en src/cliente.json → "inventario").
// Se carga una sola vez, la primera vez que entra el dueño y si todavía no hay productos.
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { cliente } from './cliente'
import { col, type Ajustes, type Vitrina } from './datos'
import { db } from './firebase'

type Articulo = { nombre?: string; precio?: number; cantidad?: number; estilo?: string; codigo?: string; ubicacion?: string }

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

export const inventarioInicial = (): Articulo[] => ((cliente as { inventario?: Articulo[] }).inventario ?? []).filter((a) => a?.nombre?.trim())

export async function cargarInventarioInicial(ajustes: Ajustes, vitrinas: Vitrina[]) {
  const lista = inventarioInicial()
  if (!lista.length) return 0
  const estilos = new Map(ajustes.estilos.map((e) => [normal(e), e]))
  // Cada reloj es una pieza que se mueve sola, así que "cantidad 3" crea 3 iguales.
  const piezas = lista.flatMap((a) => Array.from({ length: Math.min(50, Math.max(1, Math.round(Number(a.cantidad) || 1))) }, () => a)).slice(0, 2000)
  for (let i = 0; i < piezas.length; i += 400) {
    const lote = writeBatch(db)
    for (const a of piezas.slice(i, i + 400)) {
      const estilo = a.estilo ? estilos.get(normal(a.estilo)) : undefined
      const lugar = a.ubicacion ? vitrinas.find((v) => normal(v.nombre) === normal(a.ubicacion!)) : undefined
      lote.set(doc(col('productos')), {
        marca: !estilo && a.estilo ? a.estilo.trim() : '', modelo: a.nombre!.trim(), codigo: (a.codigo ?? '').toString().trim(),
        estilo: estilo ?? '', material: '', color: '', descripcion: '', precio: Number(a.precio) || 0, fotos: [], miniatura: '',
        ...(lugar ? { estado: 'exhibicion', vitrinaId: lugar.id, segmento: lugar.segmentos[0] ?? '' } : { estado: 'bodega', vitrinaId: '', segmento: '' }),
        creado: serverTimestamp(), actualizado: serverTimestamp(),
      })
    }
    await lote.commit()
  }
  return piezas.length
}

export const marcarCargado = () => setDoc(doc(db, 'ajustes', 'general'), { inventarioCargado: true }, { merge: true })
