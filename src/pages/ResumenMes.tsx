import { useMemo, useState } from 'react'
import { Vacio } from '../componentes'
import { dinero, todos, totalProforma, useLista, type Producto, type Proforma } from '../datos'
import { T } from '../textos'
import type { Contexto } from './Tienda'

type Movimiento = { id: string; concepto: string; tipo: 'entrada' | 'salida'; monto: number; dia: string }
type Gasto = { id: string; monto: number; mes: string }
type Cobro = { id: string; tipo: 'servicio' | 'accesorio'; concepto: string; precio: number; cantidad: number; dia: string }

const mesDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const etiquetaMes = (m: string) => { const [a, b] = m.split('-').map(Number); return new Date(a, b - 1, 1).toLocaleDateString('es-NI', { month: 'long', year: 'numeric' }) }
const fechaDe = (t: unknown): Date | null => (t as { toDate?: () => Date } | undefined)?.toDate?.() ?? null

// Resumen del mes: lo que ve el dueño y el colaborador. Lo de caja y gastos solo lo ve el dueño.
export default function ResumenMes({ ctx }: { ctx: Contexto }) {
  const productos = ctx.productos
  const proformas = useLista<Proforma>(todos('proformas')) ?? []
  const caja = useLista<Movimiento>(ctx.admin ? todos('caja') : null) ?? []
  const gastos = useLista<Gasto>(ctx.admin ? todos('gastos') : null) ?? []
  const cobros = useLista<Cobro>(todos('cobros')) ?? []
  const [mes, setMes] = useState(mesDe(new Date()))
  const moneda = ctx.ajustes.moneda

  const meses = useMemo(() => {
    const lista = new Set<string>([mesDe(new Date())])
    productos.forEach((p) => { const f = fechaDe(p.vendidoEn); if (f) lista.add(mesDe(f)) })
    proformas.forEach((p) => { const f = fechaDe(p.vendidaEn); if (f) lista.add(mesDe(f)) })
    return [...lista].sort().reverse()
  }, [productos, proformas])

  const vendidos = productos.filter((p: Producto) => p.estado === 'vendido' && fechaDe(p.vendidoEn) && mesDe(fechaDe(p.vendidoEn)!) === mes)
  const ventasProforma = proformas.filter((p) => p.estado === 'vendida' && fechaDe(p.vendidaEn) && mesDe(fechaDe(p.vendidaEn)!) === mes)
  const totalVentas = vendidos.reduce((s, p) => s + (Number(p.precio) || 0), 0)
  const cajaMes = caja.filter((m) => m.dia.startsWith(mes))
  const efectivo = cajaMes.reduce((s, m) => s + (m.tipo === 'entrada' ? 1 : -1) * (Number(m.monto) || 0), 0)
  const saldoCaja = caja.reduce((s, m) => s + (m.tipo === 'entrada' ? 1 : -1) * (Number(m.monto) || 0), 0)
  const gastosMes = gastos.filter((g) => g.mes === mes).reduce((s, g) => s + (Number(g.monto) || 0), 0)
  const cobrosMes = cobros.filter((c) => c.dia.startsWith(mes))
  const servicios = cobrosMes.filter((c) => c.tipo === 'servicio').reduce((s, c) => s + (Number(c.precio) || 0) * (Number(c.cantidad) || 1), 0)
  const accesorios = cobrosMes.filter((c) => c.tipo === 'accesorio').reduce((s, c) => s + (Number(c.precio) || 0) * (Number(c.cantidad) || 1), 0)
  const totalGeneral = totalVentas + servicios + accesorios
  const cambio = Number(ctx.ajustes.tipoCambio) || 0
  const enDolares = cambio > 0 ? totalGeneral / cambio : null

  return (
    <section className="pantalla">
      <div className="top"><div><h1>Resumen del mes</h1><p className="suave">{ctx.admin ? 'Lo ve el dueño y los colaboradores.' : 'Lo que se ha vendido este mes.'}</p></div></div>
      <label className="campo" htmlFor="mes-r">Mes
        <select id="mes-r" value={mes} onChange={(e) => setMes(e.target.value)}>
          {meses.map((m) => <option key={m} value={m}>{etiquetaMes(m)}</option>)}
        </select>
      </label>

      <div className="panel">
        <h3>1. Ventas</h3>
        <dl className="resumen-g">
          <dt>{T.Productos} vendidos</dt><dd><b>{vendidos.length}</b> {vendidos.length === 1 ? 'unidad' : 'unidades'}</dd>
          <dt>Proformas vendidas</dt><dd><b>{ventasProforma.length}</b></dd>
          <dt>Total de los {T.productos} vendidos</dt><dd><b>{dinero(totalVentas, moneda)}</b></dd>
          <dt>Servicios cobrados</dt><dd>{dinero(servicios, moneda)}</dd>
          <dt>Accesorios vendidos</dt><dd>{dinero(accesorios, moneda)}</dd>
        </dl>
        {vendidos.length === 0 && <Vacio>No hay ventas registradas en {etiquetaMes(mes)}.</Vacio>}
        {ventasProforma.length > 0 && (
          <div className="lista">
            {ventasProforma.map((p) => (
              <div key={p.id} className="fila" style={{ justifyContent: 'space-between' }}>
                <span>{p.cliente.nombre || 'Sin nombre'} <small className="suave">· {p.numero}</small></span>
                <b>{dinero(totalProforma(p), p.moneda)}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      {ctx.admin && (
        <div className="panel">
          <h3>2. Control de efectivo</h3>
          <dl className="resumen-g">
            <dt>Movimiento de caja del mes</dt><dd><b className={efectivo < 0 ? 'error' : ''}>{dinero(efectivo, moneda)}</b></dd>
            <dt>Dinero disponible en caja</dt><dd><b className={saldoCaja < 0 ? 'error' : ''}>{dinero(saldoCaja, moneda)}</b></dd>
            <dt>Gastos del mes</dt><dd>{dinero(gastosMes, moneda)}</dd>
          </dl>
          <p className="suave chico">Solo tú ves la caja chica y los gastos.</p>
        </div>
      )}

      <div className="panel">
        <h3>{ctx.admin ? '3' : '2'}. Resumen general</h3>
        <dl className="resumen-g">
          <dt>{T.Productos} vendidos</dt><dd>{vendidos.length}</dd>
          <dt>Proformas vendidas</dt><dd>{ventasProforma.length}</dd>
          <dt>Total vendido (incluye servicios y accesorios)</dt><dd>{dinero(totalGeneral, moneda)}</dd>
          {enDolares !== null && <><dt>Equivalente en US$ (a {cambio})</dt><dd>US$ {enDolares.toLocaleString('es-NI', { maximumFractionDigits: 2 })}</dd></>}
        </dl>
        {enDolares === null && <p className="suave chico">Para ver el equivalente en dólares, el dueño pone el tipo de cambio en Ajustes.</p>}
      </div>
    </section>
  )
}
