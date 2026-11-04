import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { useState } from 'react'
import { tiene } from '../cliente'
import { Hoja } from '../componentes'
import { col, mensajeError, type Estado, type Producto } from '../datos'
import { db } from '../firebase'
import { T } from '../textos'
import { lugarDe } from './Inventario'
import type { Contexto } from './Tienda'

export type Lugar = { estado: Estado; vitrinaId: string; segmento: string }

// Todos los lugares a donde se puede mover: cada vitrina con sus segmentos, y bodega.
export function lugaresPosibles(ctx: Contexto): { clave: string; nombre: string; lugar: Lugar }[] {
  const vitrinas = tiene('ubicaciones') ? ctx.vitrinas.flatMap((v) => (v.segmentos.length ? v.segmentos : ['']).map((s) => ({
    clave: `${v.id}|${s}`, nombre: `${v.nombre}${s ? ` · ${s}` : ''}`, lugar: { estado: 'exhibicion' as Estado, vitrinaId: v.id, segmento: s },
  }))) : []
  return [...vitrinas, { clave: 'bodega', nombre: 'En bodega', lugar: { estado: 'bodega', vitrinaId: '', segmento: '' } }]
}

const mismoLugar = (p: Producto, l: Lugar) =>
  p.estado === l.estado && (l.estado !== 'exhibicion' || ((p.vitrinaId ?? '') === l.vitrinaId && (p.segmento ?? '') === l.segmento))

// Mueve varios de una vez y deja un movimiento por cada uno (igual que al moverlos de uno en uno).
export async function moverVarios(ctx: Contexto, productos: Producto[], destino: Lugar) {
  const aMover = productos.filter((p) => !mismoLugar(p, destino))
  // Firestore acepta hasta 500 cambios por lote; cada uno usa 2 (producto + movimiento).
  for (let i = 0; i < aMover.length; i += 200) {
    const lote = writeBatch(db)
    for (const p of aMover.slice(i, i + 200)) {
      lote.update(doc(db, 'productos', p.id), { ...destino, actualizado: serverTimestamp() })
      lote.set(doc(col('movimientos')), {
        productoId: p.id, de: lugarDe(p, ctx.vitrinas), a: lugarDe({ ...p, ...destino }, ctx.vitrinas),
        por: ctx.uid, porNombre: ctx.nombre, fecha: serverTimestamp(), enGrupo: aMover.length,
      })
    }
    await lote.commit()
  }
  return aMover.length
}

// Barra que aparece abajo mientras se eligen productos.
export function BarraSeleccion({ cuantos, total, flotante, onTodos, onMover, onCancelar }: {
  cuantos: number; total: number; flotante?: boolean; onTodos: () => void; onMover: () => void; onCancelar: () => void
}) {
  return (
    <div className={`barra-seleccion ${flotante ? 'flotante' : ''}`}>
      <span>{cuantos === 0 ? `Toca los ${T.productos} que vas a mover` : `${cuantos} elegid${T.p}${cuantos === 1 ? '' : 's'}`}</span>
      <button className="luego" onClick={cuantos === total ? onCancelar : onTodos}>{cuantos === total && total > 0 ? 'Ninguno' : 'Todos'}</button>
      <button className="si" disabled={cuantos === 0} onClick={onMover}>Mover</button>
    </div>
  )
}

export function HojaMover({ ctx, productos, onCerrar, onListo }: { ctx: Contexto; productos: Producto[]; onCerrar: () => void; onListo: (n: number, a: string) => void }) {
  const [moviendo, setMoviendo] = useState('')
  const [error, setError] = useState('')
  const lugares = lugaresPosibles(ctx)
  async function elegir(clave: string, nombre: string, lugar: Lugar) {
    setMoviendo(clave); setError('')
    try { onListo(await moverVarios(ctx, productos, lugar), nombre) } catch (e) { setError(mensajeError(e)); setMoviendo('') }
  }
  return (
    <Hoja titulo={`Mover ${productos.length} ${productos.length === 1 ? T.producto : T.productos}`} onCerrar={onCerrar}>
      <p className="suave">¿A dónde van? Cada cambio queda guardado en los movimientos.</p>
      <div className="lugares">
        {lugares.map(({ clave, nombre, lugar }) => {
          const yaAhi = productos.every((p) => mismoLugar(p, lugar))
          return (
            <button key={clave} className="lugar" disabled={!!moviendo || yaAhi} onClick={() => elegir(clave, nombre, lugar)}>
              <b>{nombre}</b>
              <small>{moviendo === clave ? 'Moviendo…' : yaAhi ? 'Ya están aquí' : ''}</small>
            </button>
          )
        })}
      </div>
      {error && <p className="error">{error}</p>}
    </Hoja>
  )
}
