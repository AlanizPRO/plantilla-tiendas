import { addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { Vacio } from '../componentes'
import { col, dinero, mensajeError, todos, useLista, type Producto } from '../datos'
import { db } from '../firebase'
import { T } from '../textos'
import type { Contexto } from './Tienda'

type Gasto = { id: string; concepto: string; categoria: 'renta' | 'salarios' | 'otros'; monto: number; mes: string; creado?: { toDate: () => Date } }
type Costo = { id: string; costo: number }

const CATEGORIAS: [Gasto['categoria'], string][] = [['renta', 'Renta'], ['salarios', 'Salarios'], ['otros', 'Otros']]
const mesDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const etiquetaMes = (m: string) => { const [a, b] = m.split('-').map(Number); return new Date(a, b - 1, 1).toLocaleDateString('es-NI', { month: 'long', year: 'numeric' }) }

// Solo el dueño: ganancia real del mes = lo vendido − lo que costó − los gastos del mes.
export default function Gastos({ ctx }: { ctx: Contexto }) {
  const gastos = useLista<Gasto>(todos('gastos')) ?? []
  const costos = useLista<Costo>(todos('costos')) ?? []
  const [mes, setMes] = useState(mesDe(new Date()))
  const [concepto, setConcepto] = useState('')
  const [categoria, setCategoria] = useState<Gasto['categoria']>('renta')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState('')
  const moneda = ctx.ajustes.moneda

  const meses = useMemo(() => {
    const lista = new Set<string>([mesDe(new Date())])
    ctx.productos.forEach((p) => { const f = fechaVenta(p); if (f) lista.add(mesDe(f)) })
    gastos.forEach((g) => lista.add(g.mes))
    return [...lista].sort().reverse()
  }, [ctx.productos, gastos])

  const vendidos = ctx.productos.filter((p) => p.estado === 'vendido' && (fechaVenta(p) ? mesDe(fechaVenta(p)!) === mes : false))
  const costoDe = new Map(costos.map((c) => [c.id, Number(c.costo) || 0]))
  const ventas = vendidos.reduce((s, p) => s + (Number(p.precio) || 0), 0)
  const costoVendido = vendidos.reduce((s, p) => s + (costoDe.get(p.id) ?? 0), 0)
  const delMes = gastos.filter((g) => g.mes === mes)
  const totalGastos = delMes.reduce((s, g) => s + (Number(g.monto) || 0), 0)
  const ganancia = ventas - costoVendido - totalGastos

  async function agregar() {
    const m = Number(monto)
    if (!concepto.trim()) { setError('Escribe en qué fue el gasto.'); return }
    if (!(m > 0)) { setError('Escribe el monto.'); return }
    setError('')
    try {
      await addDoc(col('gastos'), { concepto: concepto.trim(), categoria, monto: m, mes, creado: serverTimestamp() })
      setConcepto(''); setMonto('')
    } catch (e) { setError(mensajeError(e)) }
  }
  async function quitar(id: string) {
    if (!confirm('¿Quitar este gasto?')) return
    try { await deleteDoc(doc(db, 'gastos', id)) } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <section className="pantalla">
      <div className="top"><div><h1>Gastos y ganancia</h1><p className="suave">Solo tú lo ves.</p></div></div>
      <label className="campo" htmlFor="mes-g">Mes
        <select id="mes-g" value={mes} onChange={(e) => setMes(e.target.value)}>
          {meses.map((m) => <option key={m} value={m}>{etiquetaMes(m)}</option>)}
        </select>
      </label>
      <div className="panel">
        <h3>Ganancia real de {etiquetaMes(mes)}</h3>
        <dl className="resumen-g">
          <dt>Ventas</dt><dd>{dinero(ventas, moneda)} <small className="suave">({vendidos.length} {vendidos.length === 1 ? T.producto : T.productos})</small></dd>
          <dt>Costo de lo vendido</dt><dd>− {dinero(costoVendido, moneda)}</dd>
          <dt>Gastos del mes</dt><dd>− {dinero(totalGastos, moneda)}</dd>
          <dt><b>Ganancia real</b></dt><dd><b className={ganancia < 0 ? 'error' : ''}>{dinero(ganancia, moneda)}</b></dd>
        </dl>
        <p className="suave chico">El costo sale de lo que pusiste en cada {T.producto}. Si a algún {T.producto} vendido no le pusiste costo, la ganancia sale más alta.</p>
      </div>
      <div className="panel">
        <h3>Agregar gasto</h3>
        <div className="campos">
          <label className="campo" htmlFor="g-concepto">En qué fue<input id="g-concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej. Renta del local" /></label>
          <label className="campo" htmlFor="g-cat">Tipo
            <select id="g-cat" value={categoria} onChange={(e) => setCategoria(e.target.value as Gasto['categoria'])}>
              {CATEGORIAS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </select>
          </label>
          <label className="campo" htmlFor="g-monto">Monto ({moneda})<input id="g-monto" type="number" inputMode="decimal" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-principal" onClick={agregar}>Guardar gasto</button>
      </div>
      <div className="lista">
        {delMes.length === 0 && <Vacio>No hay gastos en {etiquetaMes(mes)}.</Vacio>}
        {delMes.map((g) => (
          <div key={g.id} className="fila" style={{ justifyContent: 'space-between' }}>
            <span>{g.concepto} <small className="suave">· {CATEGORIAS.find(([v]) => v === g.categoria)?.[1]}</small></span>
            <span className="fila"><b>{dinero(g.monto, moneda)}</b><button className="btn btn-borde btn-chico" onClick={() => quitar(g.id)}>Quitar</button></span>
          </div>
        ))}
      </div>
    </section>
  )
}

function fechaVenta(p: Producto): Date | null {
  const t = (p.vendidoEn ?? p.actualizado) as { toDate?: () => Date } | undefined
  return t?.toDate ? t.toDate() : null
}
