/* eslint-disable @typescript-eslint/no-explicit-any */
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useState } from 'react'
import { Vacio } from '../componentes'
import { dinero, enlaceWhatsApp, mensajeError, todos, totalProforma, useLista, type Proforma } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import type { Contexto } from './Tienda'

type Etapa = NonNullable<Proforma['etapa']>
const ETAPAS: [Etapa, string][] = [['proforma', 'Proforma'], ['aceptada', 'Aceptada'], ['reparto', 'En reparto'], ['finalizada', 'Finalizada']]

// Etapa de una venta: la que se guardó, o (si no hay) Finalizada si ya se vendió, o Proforma.
const etapaDe = (p: Proforma): Etapa => p.etapa ?? (p.estado === 'vendida' ? 'finalizada' : 'proforma')

// Mensaje para avisarle al cliente por WhatsApp en qué etapa va su compra.
function mensajeEtapa(p: Proforma, etapa: Etapa, tienda: string) {
  const nombre = (p.cliente?.nombre || '').split(' ')[0]
  const hola = nombre ? `Hola ${nombre}` : 'Hola'
  const total = dinero(totalProforma(p), p.moneda)
  if (etapa === 'aceptada') return `${hola}, confirmamos tu pedido ${p.numero} en ${tienda} por ${total}. ¡Gracias por tu compra! Te avisamos cuando vaya en camino.`
  if (etapa === 'reparto') return `${hola}, tu pedido ${p.numero} de ${tienda} ya va en camino.`
  return `${hola}, tu pedido ${p.numero} de ${tienda} ya fue entregado. ¡Gracias por tu compra! Cualquier cosa, aquí estamos.`
}

// Tablero de ventas por etapas. Todo el equipo lo ve y avanza las ventas que creó.
export default function Tablero({ ctx }: { ctx: Contexto }) {
  const proformas = (useLista<Proforma>(todos('proformas')) ?? []).filter((p) => p.estado !== 'anulada')
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState('')

  async function mover(p: Proforma, etapa: Etapa) {
    setError(''); setTrabajando(p.id)
    try {
      const datos: Record<string, any> = { etapa, etapaCambio: serverTimestamp() }
      if (etapa === 'finalizada' && p.estado !== 'vendida') { datos.estado = 'vendida'; datos.vendidaEn = serverTimestamp() }
      await updateDoc(doc(db, 'proformas', p.id), datos)
    } catch (e) { setError(mensajeError(e)) } finally { setTrabajando('') }
  }

  return (
    <section className="pantalla">
      <div className="top"><div><h1>Tablero de ventas</h1><p className="suave">{proformas.length} ventas en curso o terminadas</p></div></div>
      {error && <p className="error">{error}</p>}
      {proformas.length === 0 && <Vacio>Todavía no hay ventas. Aparecen aquí cuando creas una proforma.</Vacio>}
      <div className="tablero">
        {ETAPAS.map(([id, nombre]) => {
          const lista = proformas.filter((p) => etapaDe(p) === id)
          const total = lista.reduce((s, p) => s + totalProforma(p), 0)
          return (
            <div key={id} className="columna-tablero">
              <div className="cabeza-columna"><b>{nombre}</b><span className="pill p-gris">{lista.length}</span></div>
              <small className="suave">{dinero(total, ctx.ajustes.moneda)}</small>
              {lista.map((p) => {
                const actual = ETAPAS.findIndex(([e]) => e === id)
                const siguiente = ETAPAS[actual + 1]
                const mia = p.vendedorUid === ctx.uid || ctx.admin
                return (
                  <div key={p.id} className="tarjeta-venta">
                    <b>{p.cliente?.nombre || p.numero}</b>
                    <small className="suave">{p.numero} · {dinero(totalProforma(p), ctx.ajustes.moneda)}</small>
                    {siguiente && mia && (
                      <button className="btn btn-verde btn-chico" disabled={trabajando === p.id} onClick={() => mover(p, siguiente[0])}>
                        {trabajando === p.id ? '…' : `Pasar a ${siguiente[1]}`}
                      </button>
                    )}
                    {id !== 'proforma' && mia && p.cliente?.telefono && (
                      <a className="btn btn-whatsapp btn-chico" href={enlaceWhatsApp(p.cliente.telefono, mensajeEtapa(p, id, ctx.ajustes.nombreTienda))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Avisar al cliente</a>
                    )}
                    {id !== 'proforma' && mia && actual > 0 && (
                      <button className="btn btn-borde btn-chico" disabled={trabajando === p.id} onClick={() => mover(p, ETAPAS[actual - 1][0])}>Regresar</button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}
