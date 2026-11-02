import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore'
import { useState } from 'react'
import { Hoja, Vacio } from '../componentes'
import { col, mensajeError, nombreProducto, type Producto, type Vitrina } from '../datos'
import { db } from '../firebase'
import { T } from '../textos'
import { HojaProducto, Tarjeta } from './Inventario'
import type { Contexto } from './Tienda'

export default function Vitrinas({ ctx }: { ctx: Contexto }) {
  const [editar, setEditar] = useState<Vitrina | 'nueva' | null>(null)
  const [abierto, setAbierto] = useState<{ vitrina: Vitrina; segmento: string } | null>(null)
  const enExhibicion = ctx.productos.filter((p) => p.estado === 'exhibicion')
  const cuantos = (vid: string, seg?: string) => enExhibicion.filter((p) => p.vitrinaId === vid && (seg === undefined || (p.segmento ?? '') === seg)).length
  const sinLugar = enExhibicion.filter((p) => !ctx.vitrinas.some((v) => v.id === p.vitrinaId)).length

  return (
    <section className="pantalla">
      <div className="top">
        <div><h1>{T.Ubicaciones}</h1><p className="suave">{enExhibicion.length} {T.productos} en exhibición</p></div>
        {ctx.admin && <button className="btn btn-principal" onClick={() => setEditar('nueva')}>+ {T.Ubicacion}</button>}
      </div>
      {ctx.vitrinas.length === 0 && <Vacio>Todavía no hay {T.ubicaciones}.{ctx.admin ? ` Toca "+ ${T.Ubicacion}" para crear la primera con sus segmentos (A, B…).` : ''}</Vacio>}
      {ctx.vitrinas.map((v) => (
        <div key={v.id} className="panel">
          <div className="fila" style={{ justifyContent: 'space-between' }}>
            <h3>{v.nombre}</h3>
            <div className="fila"><span className="pill p-gris">{cuantos(v.id)} en total</span>
              {ctx.admin && <button className="btn btn-borde btn-chico" onClick={() => setEditar(v)}>Editar</button>}</div>
          </div>
          <div className="segmentos">
            {(v.segmentos.length ? v.segmentos : ['']).map((s) => {
              const productos = enExhibicion.filter((p) => p.vitrinaId === v.id && (p.segmento ?? '') === s)
              return (
                <button key={s || 'todo'} className="segmento" onClick={() => setAbierto({ vitrina: v, segmento: s })}>
                  <span className="etiqueta">{s ? `Segmento ${s}` : 'Toda'}</span>
                  <b>{productos.length}</b>
                  <div className="minis">{productos.slice(0, 4).map((p) => p.miniatura ? <img key={p.id} src={p.miniatura} alt="" /> : null)}</div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {sinLugar > 0 && <p className="aviso">{sinLugar} {T.productos} en exhibición no tienen {T.ubicacion}. Ábrelos en {T.Productos} y elige dónde están.</p>}
      {editar && <FormVitrina ctx={ctx} v={editar === 'nueva' ? undefined : editar} cuantos={editar === 'nueva' ? 0 : cuantos(editar.id)} onCerrar={() => setEditar(null)} />}
      {abierto && <HojaSegmento ctx={ctx} {...abierto} productos={enExhibicion.filter((p) => p.vitrinaId === abierto.vitrina.id && (p.segmento ?? '') === abierto.segmento)} onCerrar={() => setAbierto(null)} />}
    </section>
  )
}

function HojaSegmento({ ctx, vitrina, segmento, productos, onCerrar }: { ctx: Contexto; vitrina: Vitrina; segmento: string; productos: Producto[]; onCerrar: () => void }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const [contando, setContando] = useState(false)
  const [vistos, setVistos] = useState<string[]>([])
  const producto = productos.find((p) => p.id === abierto)
  const faltan = productos.filter((p) => !vistos.includes(p.id))
  return (
    <Hoja titulo={`${vitrina.nombre}${segmento ? ` · ${segmento}` : ''}`} onCerrar={onCerrar}>
      <div className="fila" style={{ justifyContent: 'space-between' }}>
        <span className="suave">{productos.length} {T.productos}</span>
        {productos.length > 0 && <button className="btn btn-borde btn-chico" onClick={() => { setContando(!contando); setVistos([]) }}>{contando ? 'Terminar conteo' : 'Contar'}</button>}
      </div>
      {contando && <p className={faltan.length ? 'aviso' : 'ok'}>{faltan.length
        ? `Toca cada ${T.producto} que ves. Faltan ${faltan.length}: ${faltan.slice(0, 4).map(nombreProducto).join(', ')}${faltan.length > 4 ? '…' : ''}`
        : 'Todo completo ✓'}</p>}
      {productos.length === 0 && <Vacio>Aquí no hay {T.productos}.</Vacio>}
      <div className="rejilla">
        {productos.map((p) => <Tarjeta key={p.id} p={p} ctx={ctx} marcado={contando ? vistos.includes(p.id) : undefined}
          onClick={() => contando ? setVistos((v) => v.includes(p.id) ? v.filter((x) => x !== p.id) : [...v, p.id]) : setAbierto(p.id)} />)}
      </div>
      {producto && <HojaProducto p={producto} ctx={ctx} onCerrar={() => setAbierto(null)} />}
    </Hoja>
  )
}

function FormVitrina({ ctx, v, cuantos, onCerrar }: { ctx: Contexto; v?: Vitrina; cuantos: number; onCerrar: () => void }) {
  const [nombre, setNombre] = useState(v?.nombre ?? `${T.Ubicacion} ${ctx.vitrinas.length + 1}`)
  const [segmentos, setSegmentos] = useState<string[]>(v?.segmentos ?? ['A', 'B'])
  const [nuevo, setNuevo] = useState('')
  const [error, setError] = useState('')
  const quitados = (v?.segmentos ?? []).filter((s) => !segmentos.includes(s))
  const ocupados = quitados.filter((s) => ctx.productos.some((p) => p.estado === 'exhibicion' && p.vitrinaId === v?.id && p.segmento === s))

  async function guardar() {
    if (!nombre.trim()) { setError('Ponle nombre.'); return }
    if (ocupados.length) { setError(`El segmento ${ocupados.join(', ')} todavía tiene ${T.productos}. Muévelos antes de quitarlo.`); return }
    try {
      if (v) await updateDoc(doc(db, 'vitrinas', v.id), { nombre: nombre.trim(), segmentos })
      else await setDoc(doc(col('vitrinas')), { nombre: nombre.trim(), segmentos, orden: Date.now() })
      onCerrar()
    } catch (e) { setError(mensajeError(e)) }
  }
  async function borrar() {
    if (!v) return
    if (cuantos > 0) { setError(`Primero mueve los ${cuantos} ${T.productos} que tiene.`); return }
    if (!confirm(`¿Borrar ${v.nombre}?`)) return
    try { await deleteDoc(doc(db, 'vitrinas', v.id)); onCerrar() } catch (e) { setError(mensajeError(e)) }
  }
  function agregar() {
    const s = nuevo.trim().toUpperCase()
    if (s && !segmentos.includes(s)) setSegmentos([...segmentos, s])
    setNuevo('')
  }

  return (
    <Hoja titulo={v ? `Editar ${v.nombre}` : T.nuevaUbicacion} onCerrar={onCerrar}>
      <label className="campo" htmlFor="v-nombre">Nombre<input id="v-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
      <div className="panel">
        <h3>Segmentos</h3>
        <div className="fila">
          {segmentos.map((s) => (
            <span key={s} className="pill p-principal">{s}{' '}
              <button aria-label={`Quitar ${s}`} style={{ border: 0, background: 'transparent', color: '#fff', fontWeight: 800 }} onClick={() => setSegmentos(segmentos.filter((x) => x !== s))}>×</button>
            </span>
          ))}
          {segmentos.length === 0 && <span className="suave chico">Sin segmentos: se cuenta como un solo espacio.</span>}
        </div>
        <form className="fila" onSubmit={(e) => { e.preventDefault(); agregar() }}>
          <label className="campo" style={{ flex: 1 }} htmlFor="v-seg"><span hidden>Segmento nuevo</span>
            <input id="v-seg" value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Ej. C, Arriba, Izquierda" /></label>
          <button className="btn btn-acento" type="submit">Agregar</button>
        </form>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="fila">
        <button className="btn btn-principal" onClick={guardar}>Guardar</button>
        {v && ctx.admin && <button className="btn btn-rosa" onClick={borrar}>Borrar</button>}
      </div>
    </Hoja>
  )
}
