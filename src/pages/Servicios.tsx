import { addDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { Vacio } from '../componentes'
import { col, dinero, mensajeError, todos, useLista } from '../datos'
import { db } from '../firebase'
import type { Contexto } from './Tienda'

export type Accesorio = { id: string; nombre: string; precio: number; existencias: number }
export type Cobro = { id: string; tipo: 'servicio' | 'accesorio'; concepto: string; precio: number; cantidad: number; dia: string; por: string; porNombre?: string }

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Servicios (mantenimiento, reparación) y accesorios (baterías, tornillos…). Lo ven y registran el dueño y los colaboradores.
export default function Servicios({ ctx }: { ctx: Contexto }) {
  const accesorios = useLista<Accesorio>(todos('accesorios')) ?? []
  const cobros = useLista<Cobro>(todos('cobros')) ?? []
  const [pestana, setPestana] = useState<'servicios' | 'accesorios'>('servicios')
  const [concepto, setConcepto] = useState('')
  const [precio, setPrecio] = useState('')
  const [error, setError] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoPrecio, setNuevoPrecio] = useState('')
  const [nuevasExist, setNuevasExist] = useState('')
  const moneda = ctx.ajustes.moneda
  const delMes = useMemo(() => cobros.filter((c) => c.dia.startsWith(hoy().slice(0, 7))).sort((a, b) => (a.dia < b.dia ? 1 : -1)), [cobros])

  async function registrarServicio() {
    const p = Number(precio)
    if (!concepto.trim()) { setError('Escribe qué servicio diste.'); return }
    if (!(p > 0)) { setError('Escribe el precio que cobraste.'); return }
    setError('')
    try {
      await addDoc(col('cobros'), { tipo: 'servicio', concepto: concepto.trim(), precio: p, cantidad: 1, dia: hoy(), por: ctx.uid, porNombre: ctx.nombre, creado: serverTimestamp() })
      setConcepto(''); setPrecio('')
    } catch (e) { setError(mensajeError(e)) }
  }
  async function venderAccesorio(a: Accesorio) {
    if (a.existencias <= 0) { setError(`No hay ${a.nombre} en existencias.`); return }
    setError('')
    try {
      const lote = writeBatch(db)
      lote.update(doc(db, 'accesorios', a.id), { existencias: a.existencias - 1, actualizado: serverTimestamp() })
      lote.set(doc(col('cobros')), { tipo: 'accesorio', concepto: a.nombre, precio: Number(a.precio) || 0, cantidad: 1, dia: hoy(), por: ctx.uid, porNombre: ctx.nombre, accesorioId: a.id, creado: serverTimestamp() })
      await lote.commit()
    } catch (e) { setError(mensajeError(e)) }
  }
  async function agregarAccesorio() {
    const p = Number(nuevoPrecio); const x = Number(nuevasExist)
    if (!nuevoNombre.trim()) { setError('Escribe el nombre del accesorio.'); return }
    if (!(p >= 0)) { setError('Escribe el precio.'); return }
    setError('')
    try {
      await addDoc(col('accesorios'), { nombre: nuevoNombre.trim(), precio: p, existencias: Math.max(0, Math.floor(x) || 0), creado: serverTimestamp() })
      setNuevoNombre(''); setNuevoPrecio(''); setNuevasExist('')
    } catch (e) { setError(mensajeError(e)) }
  }
  async function quitarCobro(id: string) {
    if (!ctx.admin || !confirm('¿Quitar este cobro?')) return
    try { await deleteDoc(doc(db, 'cobros', id)) } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <section className="pantalla">
      <div className="top"><div><h1>Servicios y accesorios</h1><p className="suave">Cobros de mantenimiento, reparación y venta de accesorios.</p></div></div>
      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={pestana === 'servicios'} onClick={() => setPestana('servicios')}>Servicios</button>
        <button className="tab" role="tab" aria-selected={pestana === 'accesorios'} onClick={() => setPestana('accesorios')}>Accesorios</button>
      </div>
      {error && <p className="error">{error}</p>}

      {pestana === 'servicios' && (
        <>
          <div className="panel">
            <h3>Registrar un servicio</h3>
            <div className="campos">
              <label className="campo" htmlFor="s-concepto">Qué servicio<input id="s-concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej. Cambio de batería, mantenimiento" /></label>
              <label className="campo" htmlFor="s-precio">Cobrado ({moneda})<input id="s-precio" type="number" inputMode="decimal" min={0} value={precio} onChange={(e) => setPrecio(e.target.value)} /></label>
            </div>
            <button className="btn btn-principal" onClick={registrarServicio}>Guardar servicio</button>
          </div>
        </>
      )}

      {pestana === 'accesorios' && (
        <>
          <div className="panel">
            <h3>Vender un accesorio</h3>
            {accesorios.length === 0 && <Vacio>Todavía no hay accesorios. Agrega el primero abajo.</Vacio>}
            {accesorios.map((a) => (
              <div key={a.id} className="fila" style={{ justifyContent: 'space-between' }}>
                <span>{a.nombre} <small className="suave">· {a.existencias} en existencias</small></span>
                <span className="fila"><b>{dinero(a.precio, moneda)}</b><button className="btn btn-principal btn-chico" disabled={a.existencias <= 0} onClick={() => venderAccesorio(a)}>Vender</button></span>
              </div>
            ))}
          </div>
          <div className="panel">
            <h3>Agregar accesorio</h3>
            <div className="campos">
              <label className="campo" htmlFor="a-nombre">Nombre<input id="a-nombre" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej. Batería para reloj" /></label>
              <label className="campo" htmlFor="a-precio">Precio ({moneda})<input id="a-precio" type="number" inputMode="decimal" min={0} value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} /></label>
              <label className="campo" htmlFor="a-exist">Existencias<input id="a-exist" type="number" inputMode="numeric" min={0} value={nuevasExist} onChange={(e) => setNuevasExist(e.target.value)} /></label>
            </div>
            <button className="btn btn-borde" onClick={agregarAccesorio}>Guardar accesorio</button>
          </div>
        </>
      )}

      <div className="panel">
        <h3>Cobros de este mes</h3>
        {delMes.length === 0 && <Vacio>Todavía no hay cobros este mes.</Vacio>}
        {delMes.map((c) => (
          <div key={c.id} className="fila" style={{ justifyContent: 'space-between' }}>
            <span>{c.concepto} <small className="suave">· {c.tipo === 'servicio' ? 'Servicio' : 'Accesorio'} · {c.porNombre ?? ''}</small></span>
            <span className="fila"><b>{dinero(c.precio * c.cantidad, moneda)}</b>{ctx.admin && <button className="btn btn-borde btn-chico" onClick={() => quitarCobro(c.id)}>Quitar</button>}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
