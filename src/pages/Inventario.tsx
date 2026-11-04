import { addDoc, deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { tiene } from '../cliente'
import { Hoja, Vacio } from '../componentes'
import {
  col, dinero, ESTADOS, mensajeError, nombreProducto, useDoc, type Estado, type Foto, type Producto, type Vitrina,
} from '../datos'
import { db } from '../firebase'
import { prepararFoto } from '../fotos'
import { ICONOS } from '../iconos'
import Camara from '../camara'
import { T } from '../textos'
import { BarraSeleccion, HojaMover } from './MoverVarios'
import type { Contexto } from './Tienda'

export const lugarDe = (p: Producto, vitrinas: Vitrina[]) => {
  if (p.estado !== 'exhibicion') return ESTADOS[p.estado][0]
  const v = vitrinas.find((x) => x.id === p.vitrinaId)
  return v ? `${v.nombre}${p.segmento ? ` · ${p.segmento}` : ''}` : `Sin ${T.ubicacion}`
}

export function Tarjeta({ p, ctx, onClick, marcado }: { p: Producto; ctx: Contexto; onClick: () => void; marcado?: boolean }) {
  const [texto, pill] = ESTADOS[p.estado]
  return (
    <button className={`tarjeta ${marcado ? 'marcada' : ''}`} onClick={onClick} aria-pressed={marcado}>
      {p.miniatura ? <img src={p.miniatura} alt="" /> : <span className="sin-foto">{ICONOS.camara}</span>}
      {marcado && <span className="check-marca" aria-hidden="true">✓</span>}
      <b>{nombreProducto(p)}</b>
      <small>{dinero(p.precio, ctx.ajustes.moneda)}</small>
      <span className={`pill ${pill}`}>{p.estado === 'exhibicion' ? lugarDe(p, ctx.vitrinas) : texto}</span>
    </button>
  )
}

// Buscador con filtros que usan Inventario y la nueva selección.
export function useFiltro(productos: Producto[], inicial: Estado | 'todos' | 'disponibles' = 'disponibles') {
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<Estado | 'todos' | 'disponibles'>(inicial)
  const [estilo, setEstilo] = useState('')
  const lista = useMemo(() => productos
    .filter((p) => estado === 'todos' || (estado === 'disponibles' ? p.estado === 'exhibicion' || p.estado === 'bodega' : p.estado === estado))
    .filter((p) => !estilo || p.estilo === estilo)
    .filter((p) => `${p.marca} ${p.modelo} ${p.codigo ?? ''} ${p.color ?? ''} ${p.material ?? ''}`.toLowerCase().includes(buscar.trim().toLowerCase()))
    .sort((a, b) => nombreProducto(a).localeCompare(nombreProducto(b))), [productos, buscar, estado, estilo])
  return { lista, buscar, setBuscar, estado, setEstado, estilo, setEstilo }
}

export function Filtros({ f, estilos, conEstados = true }: { f: ReturnType<typeof useFiltro>; estilos: string[]; conEstados?: boolean }) {
  return (
    <>
      <div className="fila" style={{ flexWrap: 'nowrap' }}>
        <label className="campo" style={{ flex: 1 }} htmlFor="buscar"><span hidden>Buscar</span>
          <input id="buscar" value={f.buscar} onChange={(e) => f.setBuscar(e.target.value)} placeholder="Buscar marca, modelo o código" />
        </label>
        <label className="campo" htmlFor="estilo"><span hidden>Estilo</span>
          <select id="estilo" value={f.estilo} onChange={(e) => f.setEstilo(e.target.value)}>
            <option value="">Todos los estilos</option>
            {estilos.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
      </div>
      {conEstados && (
        <div className="tabs" role="tablist">
          {([['disponibles', 'Disponibles'], ['exhibicion', 'En exhibición'], ['bodega', 'Bodega'], ['apartado', 'Apartados'], ['vendido', 'Vendidos'], ['todos', 'Todos']] as const).map(([id, n]) => (
            <button key={id} className="tab" role="tab" aria-selected={f.estado === id} onClick={() => f.setEstado(id)}>{n}</button>
          ))}
        </div>
      )}
    </>
  )
}

// Lo que vale lo que todavía no se ha vendido: precio de venta de cada pieza (una pieza = una fila), sin costos.
export const valorInventario = (productos: Producto[]) => productos.filter((p) => p.estado !== 'vendido').reduce((s, p) => s + (Number(p.precio) || 0), 0)

export default function Inventario({ ctx, nuevo: abrirNuevo }: { ctx: Contexto; nuevo?: boolean }) {
  const f = useFiltro(ctx.productos)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState(!!abrirNuevo && ctx.admin)
  const [eligiendo, setEligiendo] = useState(false)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [moviendo, setMoviendo] = useState(false)
  const [aviso, setAviso] = useState('')
  const producto = ctx.productos.find((p) => p.id === abierto)
  // Solo se mueven los que siguen a la vista con el filtro actual.
  const aMover = f.lista.filter((p) => elegidos.includes(p.id))
  const salir = () => { setEligiendo(false); setElegidos([]) }

  return (
    <section className={`pantalla ${eligiendo ? 'con-barra' : ''}`}>
      <div className="top">
        <div><h1>{T.Productos}</h1><p className="suave">{f.lista.length} de {ctx.productos.length}</p>
          {ctx.admin && <p className="suave chico">Valor del inventario (solo tú lo ves): <b>{dinero(valorInventario(ctx.productos), ctx.ajustes.moneda)}</b></p>}</div>
        <div className="fila">
          {ctx.productos.length > 0 && <button className="btn btn-borde" onClick={() => { if (eligiendo) salir(); else { setEligiendo(true); setAviso('') } }}>{eligiendo ? 'Cancelar' : 'Mover varios'}</button>}
          {ctx.admin && !eligiendo && <button className="btn btn-principal" onClick={() => setNuevo(true)}>+ Nuevo</button>}
        </div>
      </div>
      <Filtros f={f} estilos={ctx.ajustes.estilos} />
      {aviso && <p className="ok">{aviso}</p>}
      {f.lista.length === 0 && <Vacio>{ctx.productos.length === 0 ? `Todavía no hay ${T.productos}.${ctx.admin ? ' Toca "+ Nuevo" para agregar con foto.' : ''}` : 'No hay nada con ese filtro.'}</Vacio>}
      <div className="rejilla">
        {f.lista.map((p) => <Tarjeta key={p.id} p={p} ctx={ctx} marcado={eligiendo ? elegidos.includes(p.id) : undefined}
          onClick={() => eligiendo ? setElegidos((v) => v.includes(p.id) ? v.filter((x) => x !== p.id) : [...v, p.id]) : setAbierto(p.id)} />)}
      </div>
      {eligiendo && <BarraSeleccion flotante cuantos={aMover.length} total={f.lista.length}
        onTodos={() => setElegidos(f.lista.map((p) => p.id))} onCancelar={() => setElegidos([])} onMover={() => setMoviendo(true)} />}
      {moviendo && <HojaMover ctx={ctx} productos={aMover} onCerrar={() => setMoviendo(false)}
        onListo={(n, a) => { setMoviendo(false); salir(); setAviso(`${n} ${n === 1 ? T.producto : T.productos} movid${T.p}${n === 1 ? '' : 's'} a ${a} ✓`) }} />}
      {nuevo && <FormProducto ctx={ctx} onCerrar={() => setNuevo(false)} />}
      {producto && <HojaProducto p={producto} ctx={ctx} onCerrar={() => setAbierto(null)} />}
    </section>
  )
}

// Fotos grandes: se cargan solo al abrir el producto.
export function useFotos(ids: string[] = []) {
  const [fotos, setFotos] = useState<Record<string, string>>({})
  const clave = ids.join(',')
  useEffect(() => {
    let vivo = true
    for (const id of ids) {
      getDoc(doc(db, 'fotos', id)).then((s) => { if (vivo && s.exists()) setFotos((f) => ({ ...f, [id]: (s.data() as Foto).datos })) }).catch(() => {})
    }
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])
  return fotos
}

export function Galeria({ ids, miniatura }: { ids?: string[]; miniatura?: string }) {
  const fotos = useFotos(ids)
  const [i, setI] = useState(0)
  const actual = ids?.[i]
  const src = (actual && fotos[actual]) || (i === 0 ? miniatura : undefined)
  const [ampliada, setAmpliada] = useState(false)
  return (
    <div className="galeria">
      {src ? <img className="foto-grande" src={src} alt="" role="button" tabIndex={0} title="Toca para ampliar" onClick={() => setAmpliada(true)} onKeyDown={(e) => { if (e.key === 'Enter') setAmpliada(true) }} /> : <div className="foto-grande sin-foto">{ICONOS.camara}</div>}
      {ampliada && src && (
        <div className="foto-ampliada" role="dialog" aria-label="Foto ampliada" onClick={() => setAmpliada(false)}>
          <img src={src} alt="" />
          <button className="btn btn-principal" onClick={() => setAmpliada(false)}>Cerrar</button>
        </div>
      )}
      {(ids?.length ?? 0) > 1 && (
        <div className="fila">
          {ids!.map((id, j) => (
            <button key={id} className={`punto-foto ${j === i ? 'activo' : ''}`} aria-label={`Foto ${j + 1}`} onClick={() => setI(j)} />
          ))}
        </div>
      )}
    </div>
  )
}

function SelectorLugar({ ctx, estado, vitrinaId, segmento, onCambiar }: {
  ctx: Contexto; estado: Estado; vitrinaId?: string; segmento?: string
  onCambiar: (v: { estado: Estado; vitrinaId: string; segmento: string }) => void
}) {
  const valor = estado === 'exhibicion' ? `${vitrinaId ?? ''}|${segmento ?? ''}` : estado
  const opciones = ctx.vitrinas.flatMap((v) => (v.segmentos.length ? v.segmentos : ['']).map((s) => [`${v.id}|${s}`, `${v.nombre}${s ? ` · ${s}` : ''}`]))
  return (
    <label className="campo" htmlFor="lugar">Dónde está
      <select id="lugar" value={valor} onChange={(e) => {
        const v = e.target.value
        if (v.includes('|')) { const [vid, seg] = v.split('|'); onCambiar({ estado: 'exhibicion', vitrinaId: vid, segmento: seg }) }
        else onCambiar({ estado: v as Estado, vitrinaId: '', segmento: '' })
      }}>
        {tiene('ubicaciones') && opciones.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        {(!tiene('ubicaciones') || opciones.length === 0) && <option value="|">En exhibición</option>}
        <option value="bodega">En bodega</option>
        <option value="apartado">Apartado</option>
        <option value="vendido">Vendido</option>
      </select>
    </label>
  )
}

export function HojaProducto({ p, ctx, onCerrar }: { p: Producto; ctx: Contexto; onCerrar: () => void }) {
  const [editando, setEditando] = useState(false)
  const [error, setError] = useState('')
  const costo = useDoc<{ costo: number }>(ctx.admin ? `costos/${p.id}` : null)
  if (editando) return <FormProducto ctx={ctx} p={p} onCerrar={() => setEditando(false)} />

  async function mover(v: { estado: Estado; vitrinaId: string; segmento: string }) {
    setError('')
    const antes = lugarDe(p, ctx.vitrinas)
    const despues = lugarDe({ ...p, ...v }, ctx.vitrinas)
    try {
      const lote = writeBatch(db)
      lote.update(doc(db, 'productos', p.id), { ...v, actualizado: serverTimestamp(), ...(v.estado === 'vendido' ? { vendidoEn: serverTimestamp() } : {}) })
      lote.set(doc(col('movimientos')), { productoId: p.id, de: antes, a: despues, por: ctx.uid, porNombre: ctx.nombre, fecha: serverTimestamp() })
      await lote.commit()
    } catch (e) { setError(mensajeError(e)) }
  }
  async function borrar() {
    if (!confirm(`¿Borrar ${nombreProducto(p)}? No se puede deshacer.`)) return
    try {
      const lote = writeBatch(db)
      for (const id of p.fotos ?? []) lote.delete(doc(db, 'fotos', id))
      lote.delete(doc(db, 'costos', p.id))
      lote.delete(doc(db, 'productos', p.id))
      await lote.commit(); onCerrar()
    } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <Hoja titulo={nombreProducto(p)} onCerrar={onCerrar}>
      <Galeria ids={p.fotos} miniatura={p.miniatura} />
      <div className="fila"><span className={`pill ${ESTADOS[p.estado][1]}`}>{lugarDe(p, ctx.vitrinas)}</span>{p.estilo && <span className="pill p-gris">{p.estilo}</span>}</div>
      <div className="panel">
        <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>{dinero(p.precio, ctx.ajustes.moneda)}</p>
        {ctx.admin && costo?.costo ? <p className="suave chico">Costo: {dinero(costo.costo, ctx.ajustes.moneda)} · Ganancia: {dinero(p.precio - costo.costo, ctx.ajustes.moneda)}</p> : null}
        {[['Código', p.codigo], ['Material', p.material], ['Color', p.color]].filter(([, v]) => v).map(([k, v]) => <p key={k}><b>{k}:</b> {v}</p>)}
        {p.descripcion && <p className="suave">{p.descripcion}</p>}
      </div>
      <SelectorLugar ctx={ctx} estado={p.estado} vitrinaId={p.vitrinaId} segmento={p.segmento} onCambiar={mover} />
      {error && <p className="error">{error}</p>}
      {!ctx.admin && <FotosProducto p={p} onListo={onCerrar} />}
      {ctx.admin && (
        <div className="fila">
          <button className="btn btn-borde" onClick={() => setEditando(true)}>Editar</button>
          <button className="btn btn-rosa" onClick={borrar}>Borrar</button>
        </div>
      )}
    </Hoja>
  )
}

type FotoNueva = { grande: string; miniatura: string }

function FormProducto({ ctx, p, onCerrar }: { ctx: Contexto; p?: Producto; onCerrar: () => void }) {
  const [f, setF] = useState({
    marca: p?.marca ?? '', modelo: p?.modelo ?? '', codigo: p?.codigo ?? '', estilo: p?.estilo ?? '', material: p?.material ?? '',
    color: p?.color ?? '', descripcion: p?.descripcion ?? '', precio: p ? String(p.precio) : '',
  })
  const costoGuardado = useDoc<{ costo: number }>(p ? `costos/${p.id}` : null)
  const [costo, setCosto] = useState<string | null>(null)
  const primeraVitrina = ctx.vitrinas[0]
  const [lugar, setLugar] = useState<{ estado: Estado; vitrinaId: string; segmento: string }>(p
    ? { estado: p.estado, vitrinaId: p.vitrinaId ?? '', segmento: p.segmento ?? '' }
    : primeraVitrina ? { estado: 'exhibicion', vitrinaId: primeraVitrina.id, segmento: primeraVitrina.segmentos[0] ?? '' } : { estado: 'bodega', vitrinaId: '', segmento: '' })
  const [fotosViejas, setFotosViejas] = useState<string[]>(p?.fotos ?? [])
  const [fotosNuevas, setFotosNuevas] = useState<FotoNueva[]>([])
  const [procesando, setProcesando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const poner = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))

  const [camara, setCamara] = useState(false)
  async function agregarFotos(archivos: FileList | File[] | null) {
    if (!archivos?.length) return
    setProcesando(true); setError('')
    try {
      const listas: FotoNueva[] = []
      for (const a of Array.from(archivos).slice(0, 6)) listas.push(await prepararFoto(a))
      setFotosNuevas((x) => [...x, ...listas].slice(0, 6))
    } catch (e) { setError((e as Error).message) } finally { setProcesando(false) }
  }

  async function guardar() {
    if (!f.marca.trim() && !f.modelo.trim()) { setError('Escribe la marca o el modelo.'); return }
    if (!(Number(f.precio) > 0)) { setError('Escribe el precio.'); return }
    setGuardando(true); setError('')
    try {
      const ref = p ? doc(db, 'productos', p.id) : doc(col('productos'))
      const idsNuevos: string[] = []
      for (const foto of fotosNuevas) {
        const r = await addDoc(col('fotos'), { datos: foto.grande, productoId: ref.id })
        idsNuevos.push(r.id)
      }
      for (const id of (p?.fotos ?? []).filter((x) => !fotosViejas.includes(x))) await deleteDoc(doc(db, 'fotos', id))
      const fotos = [...fotosViejas, ...idsNuevos]
      const miniatura = fotosViejas.length ? p?.miniatura ?? '' : fotosNuevas[0]?.miniatura ?? ''
      const datos = {
        marca: f.marca.trim(), modelo: f.modelo.trim(), codigo: f.codigo.trim(), estilo: f.estilo, material: f.material.trim(),
        color: f.color.trim(), descripcion: f.descripcion.trim(), precio: Number(f.precio), fotos, miniatura,
        ...lugar, actualizado: serverTimestamp(),
      }
      if (p) await updateDoc(ref, datos)
      else await setDoc(ref, { ...datos, creado: serverTimestamp() })
      if (costo !== null) await setDoc(doc(db, 'costos', ref.id), { costo: Number(costo) || 0 })
      onCerrar()
    } catch (e) { setError(mensajeError(e)); setGuardando(false) }
  }

  return (
    <Hoja titulo={p ? `Editar ${T.producto}` : T.nuevoProducto} onCerrar={onCerrar}>
      <div className="fotos-form">
        {fotosViejas.map((id, i) => (
          <div key={id} className="foto-mini"><span className="suave chico">Foto {i + 1}</span>
            <button aria-label="Quitar foto" onClick={() => setFotosViejas((x) => x.filter((y) => y !== id))}>×</button></div>
        ))}
        {fotosNuevas.map((foto, i) => (
          <div key={i} className="foto-mini"><img src={foto.miniatura} alt="" />
            <button aria-label="Quitar foto" onClick={() => setFotosNuevas((x) => x.filter((_, j) => j !== i))}>×</button></div>
        ))}
        {fotosViejas.length + fotosNuevas.length < 6 && (
          <button type="button" className="foto-mini agregar" onClick={() => setCamara(true)} disabled={procesando}>{procesando ? '…' : ICONOS.camara}<span>Tomar</span></button>
        )}
        {fotosViejas.length + fotosNuevas.length < 6 && (
          <label className="foto-mini agregar" htmlFor="p-fotos">{ICONOS.camara}<span>Galería</span>
            <input id="p-fotos" type="file" accept="image/*" multiple hidden onChange={(e) => { agregarFotos(e.target.files); e.target.value = '' }} />
          </label>
        )}
        {camara && <Camara onFoto={(f) => agregarFotos([f])} onCerrar={() => setCamara(false)} />}
      </div>
      <div className="campos">
        <label className="campo" htmlFor="p-marca">Marca<input id="p-marca" value={f.marca} onChange={(e) => poner('marca', e.target.value)} placeholder="Ej. Casio" /></label>
        <label className="campo" htmlFor="p-modelo">Modelo<input id="p-modelo" value={f.modelo} onChange={(e) => poner('modelo', e.target.value)} placeholder="Ej. Edifice EFR-526" /></label>
        <label className="campo" htmlFor="p-precio">Precio de venta *<input id="p-precio" type="number" inputMode="decimal" min={0} value={f.precio} onChange={(e) => poner('precio', e.target.value)} /></label>
        {ctx.admin && <label className="campo" htmlFor="p-costo">Costo (solo tú lo ves)<input id="p-costo" type="number" inputMode="decimal" min={0}
          value={costo ?? (costoGuardado?.costo ? String(costoGuardado.costo) : '')} onChange={(e) => setCosto(e.target.value)} /></label>}
        <label className="campo" htmlFor="p-estilo">Estilo
          <select id="p-estilo" value={f.estilo} onChange={(e) => poner('estilo', e.target.value)}>
            <option value="">Sin estilo</option>
            {ctx.ajustes.estilos.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className="campo" htmlFor="p-codigo">Código (opcional)<input id="p-codigo" value={f.codigo} onChange={(e) => poner('codigo', e.target.value)} /></label>
        <label className="campo" htmlFor="p-material">Material<input id="p-material" value={f.material} onChange={(e) => poner('material', e.target.value)} placeholder="Ej. Acero inoxidable" /></label>
        <label className="campo" htmlFor="p-color">Color<input id="p-color" value={f.color} onChange={(e) => poner('color', e.target.value)} placeholder="Ej. Plateado" /></label>
      </div>
      <SelectorLugar ctx={ctx} {...lugar} onCambiar={setLugar} />
      <label className="campo" htmlFor="p-desc">Descripción (la ve el cliente)<textarea id="p-desc" value={f.descripcion} onChange={(e) => poner('descripcion', e.target.value)} placeholder="Ej. Resistente al agua 100 m, cristal de zafiro" /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" disabled={guardando || procesando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</button>
    </Hoja>
  )
}

// Fotos del producto para el vendedor (no puede cambiar precio ni datos del reloj).
function FotosProducto({ p, onListo }: { p: Producto; onListo: () => void }) {
  const [viejas, setViejas] = useState<string[]>(p.fotos ?? [])
  const [nuevas, setNuevas] = useState<FotoNueva[]>([])
  const [procesando, setProcesando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const total = viejas.length + nuevas.length

  const [camara, setCamara] = useState(false)
  async function agregar(archivos: FileList | File[] | null) {
    if (!archivos?.length) return
    setProcesando(true); setError('')
    try {
      const listas: FotoNueva[] = []
      for (const a of Array.from(archivos).slice(0, 6 - total)) listas.push(await prepararFoto(a))
      setNuevas((x) => [...x, ...listas].slice(0, 6 - viejas.length))
    } catch (e) { setError((e as Error).message) } finally { setProcesando(false) }
  }

  async function guardar() {
    setGuardando(true); setError('')
    try {
      const idsNuevos: string[] = []
      for (const foto of nuevas) {
        const r = await addDoc(col('fotos'), { datos: foto.grande, productoId: p.id })
        idsNuevos.push(r.id)
      }
      for (const id of (p.fotos ?? []).filter((x) => !viejas.includes(x))) await deleteDoc(doc(db, 'fotos', id))
      const fotos = [...viejas, ...idsNuevos]
      const miniatura = viejas.length ? p.miniatura ?? '' : nuevas[0]?.miniatura ?? ''
      await updateDoc(doc(db, 'productos', p.id), { fotos, miniatura, actualizado: serverTimestamp() })
      onListo()
    } catch (e) { setError(mensajeError(e)); setGuardando(false) }
  }

  return (
    <div className="panel">
      <h3>Fotos</h3>
      <div className="fotos-form">
        {viejas.map((id, i) => (
          <div key={id} className="foto-mini"><span className="suave chico">Foto {i + 1}</span>
            <button aria-label="Quitar foto" onClick={() => setViejas((x) => x.filter((y) => y !== id))}>×</button></div>
        ))}
        {nuevas.map((foto, i) => (
          <div key={i} className="foto-mini"><img src={foto.miniatura} alt="" />
            <button aria-label="Quitar foto" onClick={() => setNuevas((x) => x.filter((_, j) => j !== i))}>×</button></div>
        ))}
        {total < 6 && (
          <button type="button" className="foto-mini agregar" onClick={() => setCamara(true)} disabled={procesando}>{procesando ? '…' : ICONOS.camara}<span>Tomar</span></button>
        )}
        {total < 6 && (
          <label className="foto-mini agregar" htmlFor="v-fotos">{ICONOS.camara}<span>Galería</span>
            <input id="v-fotos" type="file" accept="image/*" multiple hidden onChange={(e) => { agregar(e.target.files); e.target.value = '' }} />
          </label>
        )}
      </div>
      {camara && <Camara onFoto={(f) => agregar([f])} onCerrar={() => setCamara(false)} />}
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" disabled={guardando || procesando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar fotos'}</button>
    </div>
  )
}
