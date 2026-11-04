import { addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { Vacio } from '../componentes'
import { col, dinero, mensajeError, todos, useLista } from '../datos'
import { db } from '../firebase'
import type { Contexto } from './Tienda'

type Movimiento = { id: string; concepto: string; tipo: 'entrada' | 'salida'; monto: number; dia: string; creado?: { toDate: () => Date } }

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const etiquetaDia = (d: string) => { const [a, b, c] = d.split('-').map(Number); return new Date(a, b - 1, c).toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric', month: 'short' }) }

// Solo el dueño: efectivo de la caja chica. Entradas suman, salidas restan.
export default function CajaChica({ ctx }: { ctx: Contexto }) {
  const movimientos = useLista<Movimiento>(todos('caja')) ?? []
  const [concepto, setConcepto] = useState('')
  const [tipo, setTipo] = useState<Movimiento['tipo']>('salida')
  const [monto, setMonto] = useState('')
  const [dia, setDia] = useState(hoy())
  const [error, setError] = useState('')
  const moneda = ctx.ajustes.moneda

  const saldo = useMemo(() => movimientos.reduce((s, m) => s + (m.tipo === 'entrada' ? 1 : -1) * (Number(m.monto) || 0), 0), [movimientos])
  const dias = useMemo(() => {
    const grupos = new Map<string, Movimiento[]>()
    ;[...movimientos].sort((a, b) => (a.dia < b.dia ? 1 : -1)).forEach((m) => grupos.set(m.dia, [...(grupos.get(m.dia) ?? []), m]))
    return [...grupos.entries()]
  }, [movimientos])

  async function agregar() {
    const m = Number(monto)
    if (!concepto.trim()) { setError('Escribe en qué se usó o de dónde vino el dinero.'); return }
    if (!(m > 0)) { setError('Escribe el monto.'); return }
    setError('')
    try {
      await addDoc(col('caja'), { concepto: concepto.trim(), tipo, monto: m, dia, creado: serverTimestamp() })
      setConcepto(''); setMonto('')
    } catch (e) { setError(mensajeError(e)) }
  }
  async function quitar(id: string) {
    if (!confirm('¿Quitar este movimiento?')) return
    try { await deleteDoc(doc(db, 'caja', id)) } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <section className="pantalla">
      <div className="top"><div><h1>Caja chica</h1><p className="suave">Solo tú lo ves.</p></div></div>
      <div className="panel">
        <h3>Saldo actual</h3>
        <p style={{ fontSize: 28 }}><b className={saldo < 0 ? 'error' : ''}>{dinero(saldo, moneda)}</b></p>
      </div>
      <div className="panel">
        <h3>Registrar movimiento</h3>
        <div className="campos">
          <label className="campo" htmlFor="c-tipo">Tipo
            <select id="c-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as Movimiento['tipo'])}>
              <option value="entrada">Entrada (metí dinero)</option>
              <option value="salida">Salida (saqué dinero)</option>
            </select>
          </label>
          <label className="campo" htmlFor="c-concepto">En qué se usó o de dónde vino<input id="c-concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej. Bolsas y papel" /></label>
          <label className="campo" htmlFor="c-monto">Monto ({moneda})<input id="c-monto" type="number" inputMode="decimal" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
          <label className="campo" htmlFor="c-dia">Día<input id="c-dia" type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></label>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-principal" onClick={agregar}>Guardar movimiento</button>
      </div>
      <div className="lista">
        {movimientos.length === 0 && <Vacio>Todavía no hay movimientos en la caja chica.</Vacio>}
        {dias.map(([d, lista]) => (
          <div key={d}>
            <h3>{etiquetaDia(d)}</h3>
            {lista.map((m) => (
              <div key={m.id} className="fila" style={{ justifyContent: 'space-between' }}>
                <span>{m.concepto} <small className="suave">· {m.tipo === 'entrada' ? 'Entrada' : 'Salida'}</small></span>
                <span className="fila"><b>{m.tipo === 'entrada' ? '+' : '−'} {dinero(m.monto, moneda)}</b><button className="btn btn-borde btn-chico" onClick={() => quitar(m.id)}>Quitar</button></span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
