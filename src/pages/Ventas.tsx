import { deleteDoc, deleteField, doc, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { useState } from 'react'
import { tiene } from '../cliente'
import { Hoja, Vacio } from '../componentes'
import {
  codigoEnlace, col, dinero, enlaceWhatsApp, fechaCorta, mensajeError, nombreProducto, numeroProforma, sumarDias, totalProforma, useLista,
  type ItemProforma, type ItemSeleccion, type Producto, type Proforma, type Seleccion,
} from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { T } from '../textos'
import { Filtros, lugarDe, Tarjeta, useFiltro } from './Inventario'
import type { Contexto } from './Tienda'

const MAX_SELECCION = 12
const enlace = (tipo: 's' | 'p', id: string) => `${location.origin}/${tipo}/${id}`

const ESTADO_SELECCION: Record<Seleccion['estado'], [string, string]> = {
  enviada: ['Esperando', 'p-gris'], respondida: ['Ya eligió', 'p-rosa'], atendida: ['Atendida', 'p-verde'],
}
const ESTADO_PROFORMA: Record<Proforma['estado'], [string, string]> = {
  borrador: ['Borrador', 'p-gris'], enviada: ['Enviada', 'p-amarillo'], vendida: ['Vendida', 'p-verde'], anulada: ['Anulada', 'p-rosa'],
}

type Abierto =
  | { tipo: 'nueva-seleccion' } | { tipo: 'seleccion'; id: string }
  | { tipo: 'proforma'; id: string } | { tipo: 'editar-proforma'; p?: Proforma; desde?: Seleccion }

function abiertoInicial(accion: string): Abierto | null {
  if (accion === 'nueva-seleccion') return { tipo: 'nueva-seleccion' }
  if (accion === 'nueva-proforma') return { tipo: 'editar-proforma' }
  if (accion.startsWith('seleccion:')) return { tipo: 'seleccion', id: accion.slice(10) }
  return null
}

export default function Ventas({ ctx, selecciones, accion }: { ctx: Contexto; selecciones: Seleccion[]; accion: string }) {
  const [pestana, setPestana] = useState<'selecciones' | 'proformas'>(tiene('selecciones') && accion !== 'nueva-proforma' ? 'selecciones' : 'proformas')
  const [abierto, setAbierto] = useState<Abierto | null>(abiertoInicial(accion))
  const proformasTodas = useLista<Proforma>(query(col('proformas'), orderBy('creada', 'desc'))) ?? []
  const mias = <X extends { vendedorUid: string }>(l: X[]) => l.filter((x) => ctx.admin || x.vendedorUid === ctx.uid)
  const listaSel = mias(selecciones).sort((a, b) => orden(a.estado) - orden(b.estado) || (b.creada?.toMillis() ?? 0) - (a.creada?.toMillis() ?? 0))
  const proformas = mias(proformasTodas)
  const cerrar = () => setAbierto(null)
  const seleccion = abierto?.tipo === 'seleccion' ? selecciones.find((s) => s.id === abierto.id) : undefined
  const proforma = abierto?.tipo === 'proforma' ? proformasTodas.find((p) => p.id === abierto.id) : undefined

  return (
    <section className="pantalla">
      <div className="top">
        <div><h1>Ventas</h1><p className="suave">{ctx.admin ? 'De toda la tienda' : 'Tus clientes'}</p></div>
        <button className="btn btn-principal" onClick={() => setAbierto(pestana === 'selecciones' ? { tipo: 'nueva-seleccion' } : { tipo: 'editar-proforma' })}>+ Nueva</button>
      </div>
      {tiene('selecciones') && tiene('proformas') && (
        <div className="tabs" role="tablist">
          <button className="tab" role="tab" aria-selected={pestana === 'selecciones'} onClick={() => setPestana('selecciones')}>Selecciones</button>
          <button className="tab" role="tab" aria-selected={pestana === 'proformas'} onClick={() => setPestana('proformas')}>Proformas</button>
        </div>
      )}

      {pestana === 'selecciones' && (
        <>
          {listaSel.length === 0 && <Vacio>Todavía no has mandado selecciones. Toca "+ Nueva", elige unos {T.productos} y mándale el enlace al cliente por WhatsApp.</Vacio>}
          <div className="lista">
            {listaSel.map((s) => {
              const [texto, pill] = ESTADO_SELECCION[s.estado]
              const elegidos = s.items.filter((i) => s.elegidos.includes(i.id))
              return (
                <button key={s.id} className="fila-item" onClick={() => setAbierto({ tipo: 'seleccion', id: s.id })}>
                  {(elegidos[0] ?? s.items[0])?.miniatura ? <img className="mini" src={(elegidos[0] ?? s.items[0]).miniatura} alt="" /> : <span className="ini">{s.items.length}</span>}
                  <div><b>{s.cliente.nombre}</b>
                    <small>{s.estado === 'enviada' ? `${s.items.length} ${T.productos}` : `Eligió ${elegidos.length}`}{s.creada ? ` · ${fechaCorta(s.creada.toDate())}` : ''}{ctx.admin ? ` · ${s.vendedorNombre}` : ''}</small></div>
                  <span className={`pill ${pill}`}>{texto}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {pestana === 'proformas' && (
        <>
          {proformas.length === 0 && <Vacio>Todavía no hay proformas.</Vacio>}
          <div className="lista">
            {proformas.map((p) => {
              const [texto, pill] = ESTADO_PROFORMA[p.estado]
              return (
                <button key={p.id} className="fila-item" onClick={() => setAbierto({ tipo: 'proforma', id: p.id })}>
                  {p.items[0]?.miniatura ? <img className="mini" src={p.items[0].miniatura} alt="" /> : <span className="ini">{ICONOS.ventas}</span>}
                  <div><b>{p.cliente.nombre || 'Sin nombre'}</b>
                    <small>{p.numero} · {dinero(totalProforma(p), p.moneda)}{ctx.admin ? ` · ${p.vendedorNombre}` : ''}</small></div>
                  <span className={`pill ${pill}`}>{texto}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {abierto?.tipo === 'nueva-seleccion' && <NuevaSeleccion ctx={ctx} onCerrar={cerrar} onCreada={(id) => setAbierto({ tipo: 'seleccion', id })} />}
      {abierto?.tipo === 'seleccion' && seleccion && <DetalleSeleccion ctx={ctx} s={seleccion} onCerrar={cerrar}
        onProforma={() => setAbierto({ tipo: 'editar-proforma', desde: seleccion })} />}
      {abierto?.tipo === 'proforma' && proforma && <DetalleProforma ctx={ctx} p={proforma} onCerrar={cerrar} onEditar={() => setAbierto({ tipo: 'editar-proforma', p: proforma })} />}
      {abierto?.tipo === 'editar-proforma' && <EditorProforma ctx={ctx} p={abierto.p} desde={abierto.desde} onCerrar={cerrar}
        onGuardada={(id) => { setPestana('proformas'); setAbierto({ tipo: 'proforma', id }) }} />}
    </section>
  )
}

const orden = (e: Seleccion['estado']) => ({ respondida: 0, enviada: 1, atendida: 2 })[e]

// ---------- Elegir productos (selección y proforma) ----------
function ElegirProductos({ ctx, elegidos, onCambiar, max }: { ctx: Contexto; elegidos: string[]; onCambiar: (ids: string[]) => void; max: number }) {
  const f = useFiltro(ctx.productos)
  return (
    <>
      <Filtros f={f} estilos={ctx.ajustes.estilos} conEstados={false} />
      <p className="suave chico">{elegidos.length} elegid{T.p}s{elegidos.length >= max ? ` (máximo ${max})` : ''}. Solo se muestran los disponibles.</p>
      {f.lista.length === 0 && <Vacio>No hay {T.productos} disponibles con ese filtro.</Vacio>}
      <div className="rejilla">
        {f.lista.map((p) => <Tarjeta key={p.id} p={p} ctx={ctx} marcado={elegidos.includes(p.id)}
          onClick={() => onCambiar(elegidos.includes(p.id) ? elegidos.filter((x) => x !== p.id) : elegidos.length < max ? [...elegidos, p.id] : elegidos)} />)}
      </div>
    </>
  )
}

const aItem = (p: Producto): ItemSeleccion => ({
  id: p.id, marca: p.marca, modelo: p.modelo, estilo: p.estilo ?? '', precio: p.precio, miniatura: p.miniatura ?? '', fotos: p.fotos ?? [], descripcion: p.descripcion ?? '',
})

// ---------- Nueva selección ----------
function NuevaSeleccion({ ctx, onCerrar, onCreada }: { ctx: Contexto; onCerrar: () => void; onCreada: (id: string) => void }) {
  const [paso, setPaso] = useState<1 | 2>(1)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [precios, setPrecios] = useState(true)
  const [dias, setDias] = useState(7)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function crear() {
    if (!nombre.trim()) { setError('Escribe el nombre del cliente.'); return }
    setGuardando(true); setError('')
    try {
      const id = codigoEnlace()
      const items = elegidos.map((pid) => ctx.productos.find((p) => p.id === pid)).filter((p): p is Producto => !!p).map(aItem)
      await setDoc(doc(db, 'selecciones', id), {
        vendedorUid: ctx.uid, vendedorNombre: ctx.nombre, telefonoVendedor: ctx.telefono,
        cliente: { nombre: nombre.trim(), telefono: telefono.trim() }, mostrarPrecios: precios, items,
        elegidos: [], nota: '', estado: 'enviada', creada: serverTimestamp(), vence: Timestamp.fromDate(sumarDias(new Date(), dias)),
      })
      onCreada(id)
    } catch (e) { setError(mensajeError(e)); setGuardando(false) }
  }

  return (
    <Hoja titulo="Nueva selección" onCerrar={onCerrar}>
      {paso === 1 && (
        <>
          <p className="suave">1 de 2 · Toca los {T.productos} que le quieres mostrar al cliente.</p>
          <ElegirProductos ctx={ctx} elegidos={elegidos} onCambiar={setElegidos} max={MAX_SELECCION} />
          <button className="btn btn-principal" disabled={!elegidos.length} onClick={() => setPaso(2)}>Seguir con {elegidos.length} {elegidos.length === 1 ? T.producto : T.productos}</button>
        </>
      )}
      {paso === 2 && (
        <>
          <p className="suave">2 de 2 · ¿Para quién es?</p>
          <div className="campos">
            <label className="campo" htmlFor="s-nombre">Nombre del cliente *<input id="s-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" /></label>
            <label className="campo" htmlFor="s-tel">WhatsApp del cliente<input id="s-tel" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej. 8888 8888" /></label>
            <label className="campo" htmlFor="s-dias">El enlace dura
              <select id="s-dias" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
                {[1, 3, 7, 15, 30].map((d) => <option key={d} value={d}>{d} {d === 1 ? 'día' : 'días'}</option>)}
              </select>
            </label>
          </div>
          <label className="check"><input type="checkbox" checked={precios} onChange={(e) => setPrecios(e.target.checked)} />Mostrar los precios al cliente</label>
          {error && <p className="error">{error}</p>}
          <div className="fila">
            <button className="btn btn-borde" onClick={() => setPaso(1)}>Atrás</button>
            <button className="btn btn-principal" disabled={guardando} onClick={crear}>{guardando ? 'Creando…' : 'Crear enlace'}</button>
          </div>
        </>
      )}
    </Hoja>
  )
}

// ---------- Detalle de una selección ----------
function DetalleSeleccion({ ctx, s, onCerrar, onProforma }: { ctx: Contexto; s: Seleccion; onCerrar: () => void; onProforma: () => void }) {
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)
  const url = enlace('s', s.id)
  const vencida = (s.vence?.toMillis() ?? 0) < Date.now()
  const elegidos = s.items.filter((i) => s.elegidos.includes(i.id))
  const texto = `Hola ${s.cliente.nombre.split(' ')[0]}, soy ${ctx.nombre.split(' ')[0] || 'de'} ${ctx.ajustes.nombreTienda}. Te preparé ${s.items.length} opciones de ${T.productos}. Míralas aquí y marca las que te gusten: ${url}`

  async function copiar() {
    try { await navigator.clipboard.writeText(url); setCopiado(true) } catch { prompt('Copia el enlace:', url) }
  }
  async function cambiar(datos: Partial<Seleccion>) {
    try { await updateDoc(doc(db, 'selecciones', s.id), datos) } catch (e) { setError(mensajeError(e)) }
  }
  async function borrar() {
    if (!confirm('¿Borrar esta selección? El enlace dejará de funcionar.')) return
    try { await deleteDoc(doc(db, 'selecciones', s.id)); onCerrar() } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <Hoja titulo={s.cliente.nombre} onCerrar={onCerrar}>
      <div className="fila">
        <span className={`pill ${ESTADO_SELECCION[s.estado][1]}`}>{ESTADO_SELECCION[s.estado][0]}</span>
        {vencida ? <span className="pill p-rosa">Enlace vencido</span> : s.vence && <span className="pill p-gris">Vence {fechaCorta(s.vence.toDate())}</span>}
        {ctx.admin && <span className="pill p-gris">{s.vendedorNombre}</span>}
      </div>
      {s.estado !== 'enviada' && (
        <div className="panel">
          <h3>{elegidos.length ? `Le gustó${elegidos.length > 1 ? 'ron' : ''}:` : 'No marcó ninguno'}</h3>
          {elegidos.map((i) => <p key={i.id}>♥ <b>{nombreProducto(i)}</b> · {dinero(i.precio, ctx.ajustes.moneda)}</p>)}
          {s.nota && <p className="suave">“{s.nota}”</p>}
        </div>
      )}
      <div className="rejilla">
        {s.items.map((i) => {
          const p = ctx.productos.find((x) => x.id === i.id)
          return (
            <div key={i.id} className={`tarjeta ${s.elegidos.includes(i.id) ? 'marcada' : ''}`}>
              {i.miniatura ? <img src={i.miniatura} alt="" /> : <span className="sin-foto">{ICONOS.camara}</span>}
              {s.elegidos.includes(i.id) && <span className="check-marca" aria-label="Le gustó">♥</span>}
              <b>{nombreProducto(i)}</b>
              <small>{dinero(i.precio, ctx.ajustes.moneda)}</small>
              <span className={`pill ${p?.estado === 'vendido' ? 'p-rosa' : 'p-gris'}`}>{p ? lugarDe(p, ctx.vitrinas) : 'Ya no está'}</span>
            </div>
          )
        })}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="fila">
        {tiene('proformas') && <button className="btn btn-principal" onClick={onProforma}>Hacer proforma</button>}
        <a className="btn btn-whatsapp" href={enlaceWhatsApp(s.cliente.telefono, texto)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Enviar por WhatsApp</a>
        <button className="btn btn-borde" onClick={copiar}>{ICONOS.enlace}{copiado ? 'Copiado' : 'Copiar enlace'}</button>
      </div>
      <div className="fila">
        {s.estado !== 'atendida' && <button className="btn btn-borde btn-chico" onClick={() => cambiar({ estado: 'atendida' })}>Marcar como atendida</button>}
        {vencida && <button className="btn btn-borde btn-chico" onClick={() => cambiar({ vence: Timestamp.fromDate(sumarDias(new Date(), 7)) })}>Abrir el enlace 7 días más</button>}
        <button className="btn btn-rosa btn-chico" onClick={borrar}>Borrar</button>
      </div>
    </Hoja>
  )
}

// ---------- Proformas ----------
function EditorProforma({ ctx, p, desde, onCerrar, onGuardada }: { ctx: Contexto; p?: Proforma; desde?: Seleccion; onCerrar: () => void; onGuardada: (id: string) => void }) {
  const desdeItems = desde ? desde.items.filter((i) => desde.elegidos.length === 0 || desde.elegidos.includes(i.id)) : []
  const [cliente, setCliente] = useState(p?.cliente ?? desde?.cliente ?? { nombre: '', telefono: '' })
  const [items, setItems] = useState<ItemProforma[]>(p?.items ?? desdeItems.map((i) => ({ productoId: i.id, descripcion: nombreProducto(i), precio: i.precio, cantidad: 1, miniatura: i.miniatura ?? '' })))
  const [descuento, setDescuento] = useState(String(p?.descuento ?? ''))
  const [validez, setValidez] = useState(p?.validezDias ?? ctx.ajustes.validezDias)
  const [garantia, setGarantia] = useState(p?.garantia ?? ctx.ajustes.garantia)
  const [nota, setNota] = useState(p?.nota ?? ctx.ajustes.notaProforma)
  const [eligiendo, setEligiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const moneda = p?.moneda ?? ctx.ajustes.moneda
  const total = totalProforma({ items, descuento: Number(descuento) || 0 })
  const ponerItem = (i: number, cambio: Partial<ItemProforma>) => setItems((l) => l.map((x, j) => (j === i ? { ...x, ...cambio } : x)))

  function elegirProductos(ids: string[]) {
    const quedan = items.filter((i) => !i.productoId || ids.includes(i.productoId))
    const nuevos = ids.filter((id) => !items.some((i) => i.productoId === id)).map((id) => ctx.productos.find((x) => x.id === id)).filter((x): x is Producto => !!x)
      .map((x) => ({ productoId: x.id, descripcion: nombreProducto(x), precio: x.precio, cantidad: 1, miniatura: x.miniatura ?? '' }))
    setItems([...quedan, ...nuevos])
  }

  async function guardar() {
    const limpios = items.filter((i) => i.descripcion.trim())
    if (!limpios.length) { setError(`Agrega al menos un ${T.producto} o una línea.`); return }
    setGuardando(true); setError('')
    try {
      const datos = {
        cliente: { nombre: cliente.nombre.trim(), telefono: (cliente.telefono ?? '').trim() },
        items: limpios.map((i) => ({ ...i, descripcion: i.descripcion.trim(), precio: Number(i.precio) || 0, cantidad: Math.max(1, Number(i.cantidad) || 1) })),
        descuento: Number(descuento) || 0, validezDias: validez, garantia: garantia.trim(), nota: nota.trim(),
      }
      if (p) { await updateDoc(doc(db, 'proformas', p.id), datos); onGuardada(p.id); return }
      const id = codigoEnlace()
      const lote = writeBatch(db)
      lote.set(doc(db, 'proformas', id), {
        ...datos, numero: numeroProforma(), moneda, estado: 'borrador', seleccionId: desde?.id ?? '',
        vendedorUid: ctx.uid, vendedorNombre: ctx.nombre, creada: serverTimestamp(),
      })
      if (desde && desde.estado !== 'atendida') lote.update(doc(db, 'selecciones', desde.id), { estado: 'atendida' })
      await lote.commit()
      onGuardada(id)
    } catch (e) { setError(mensajeError(e)); setGuardando(false) }
  }

  if (eligiendo) {
    return (
      <Hoja titulo={`Agregar ${T.productos}`} onCerrar={() => setEligiendo(false)}>
        <ElegirProductos ctx={ctx} elegidos={items.flatMap((i) => (i.productoId ? [i.productoId] : []))} onCambiar={elegirProductos} max={30} />
        <button className="btn btn-principal" onClick={() => setEligiendo(false)}>Listo</button>
      </Hoja>
    )
  }

  return (
    <Hoja titulo={p ? `Editar ${p.numero}` : 'Nueva proforma'} onCerrar={onCerrar}>
      <div className="campos">
        <label className="campo" htmlFor="pf-nombre">Cliente<input id="pf-nombre" value={cliente.nombre} onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })} /></label>
        <label className="campo" htmlFor="pf-tel">WhatsApp<input id="pf-tel" type="tel" inputMode="tel" value={cliente.telefono ?? ''} onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })} /></label>
      </div>
      <div className="panel">
        <h3>Detalle</h3>
        {items.length === 0 && <p className="suave chico">Todavía no hay nada. Agrega {T.productos} del inventario o escribe una línea (por ejemplo, un servicio).</p>}
        {items.map((i, n) => (
          <div key={n} className="linea-proforma">
            {i.miniatura ? <img className="mini" src={i.miniatura} alt="" /> : <span className="ini">{n + 1}</span>}
            <label className="campo" htmlFor={`pf-d${n}`}><span hidden>Descripción</span>
              <input id={`pf-d${n}`} value={i.descripcion} onChange={(e) => ponerItem(n, { descripcion: e.target.value })} placeholder="Descripción" /></label>
            <label className="campo" htmlFor={`pf-c${n}`}><span hidden>Cantidad</span>
              <input id={`pf-c${n}`} type="number" inputMode="numeric" min={1} value={i.cantidad} onChange={(e) => ponerItem(n, { cantidad: Number(e.target.value) })} /></label>
            <label className="campo" htmlFor={`pf-p${n}`}><span hidden>Precio</span>
              <input id={`pf-p${n}`} type="number" inputMode="decimal" min={0} value={i.precio} onChange={(e) => ponerItem(n, { precio: Number(e.target.value) })} /></label>
            <button className="btn btn-rosa btn-chico" aria-label="Quitar línea" onClick={() => setItems(items.filter((_, j) => j !== n))}>×</button>
          </div>
        ))}
        <div className="fila">
          <button className="btn btn-acento btn-chico" onClick={() => setEligiendo(true)}>+ {T.Productos}</button>
          <button className="btn btn-borde btn-chico" onClick={() => setItems([...items, { descripcion: '', precio: 0, cantidad: 1 }])}>+ Línea libre</button>
        </div>
      </div>
      <div className="campos">
        <label className="campo" htmlFor="pf-desc">Descuento ({moneda})<input id="pf-desc" type="number" inputMode="decimal" min={0} value={descuento} onChange={(e) => setDescuento(e.target.value)} /></label>
        <label className="campo" htmlFor="pf-val">Válida por (días)<input id="pf-val" type="number" inputMode="numeric" min={1} value={validez} onChange={(e) => setValidez(Number(e.target.value) || 1)} /></label>
      </div>
      <label className="campo" htmlFor="pf-gar">Garantía<input id="pf-gar" value={garantia} onChange={(e) => setGarantia(e.target.value)} placeholder="Ej. 1 año de garantía en maquinaria" /></label>
      <label className="campo" htmlFor="pf-nota">Nota<textarea id="pf-nota" value={nota} onChange={(e) => setNota(e.target.value)} /></label>
      <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>Total: {dinero(total, moneda)}</p>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar proforma'}</button>
    </Hoja>
  )
}

function DetalleProforma({ ctx, p, onCerrar, onEditar }: { ctx: Contexto; p: Proforma; onCerrar: () => void; onEditar: () => void }) {
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const url = enlace('p', p.id)
  const abierta = p.estado === 'borrador' || p.estado === 'enviada'
  const texto = `Hola ${(p.cliente.nombre || '').split(' ')[0]}, te comparto la proforma ${p.numero} de ${ctx.ajustes.nombreTienda} por ${dinero(totalProforma(p), p.moneda)}: ${url}`

  async function marcarEnviada() {
    if (p.estado === 'borrador') updateDoc(doc(db, 'proformas', p.id), { estado: 'enviada' }).catch(() => {})
  }
  async function vender() {
    const conProducto = p.items.filter((i) => i.productoId)
    if (!confirm(`¿Registrar la venta?${conProducto.length ? ` ${conProducto.length} ${conProducto.length === 1 ? T.producto : T.productos} pasarán a "Vendido".` : ''}`)) return
    setTrabajando(true); setError('')
    try {
      const lote = writeBatch(db)
      lote.update(doc(db, 'proformas', p.id), { estado: 'vendida', vendidaEn: serverTimestamp() })
      for (const i of conProducto) {
        const prod = ctx.productos.find((x) => x.id === i.productoId)
        if (!prod || prod.estado === 'vendido') continue
        lote.update(doc(db, 'productos', prod.id), { estado: 'vendido', estadoAntes: prod.estado, vendidoEn: serverTimestamp(), actualizado: serverTimestamp() })
        lote.set(doc(col('movimientos')), { productoId: prod.id, de: lugarDe(prod, ctx.vitrinas), a: `Vendido (${p.numero})`, por: ctx.uid, porNombre: ctx.nombre, fecha: serverTimestamp() })
      }
      await lote.commit()
    } catch (e) { setError(mensajeError(e)) } finally { setTrabajando(false) }
  }
  // Deshacer una venta registrada por error: la proforma vuelve a enviada y cada pieza regresa a como estaba.
  async function deshacerVenta() {
    if (!confirm('¿Deshacer esta venta? Las piezas vuelven a como estaban antes de venderse.')) return
    setTrabajando(true); setError('')
    try {
      const lote = writeBatch(db)
      lote.update(doc(db, 'proformas', p.id), { estado: 'enviada', etapa: 'proforma', vendidaEn: deleteField(), etapaCambio: serverTimestamp() })
      for (const i of p.items.filter((x) => x.productoId)) {
        const prod = ctx.productos.find((x) => x.id === i.productoId)
        if (!prod || prod.estado !== 'vendido') continue
        lote.update(doc(db, 'productos', prod.id), { estado: prod.estadoAntes ?? 'exhibicion', estadoAntes: deleteField(), vendidoEn: deleteField(), actualizado: serverTimestamp() })
        lote.set(doc(col('movimientos')), { productoId: prod.id, de: `Vendido (${p.numero})`, a: 'Venta deshecha', por: ctx.uid, porNombre: ctx.nombre, fecha: serverTimestamp() })
      }
      await lote.commit()
    } catch (e) { setError(mensajeError(e)) } finally { setTrabajando(false) }
  }
  async function anular() {
    if (!confirm('¿Anular esta proforma?')) return
    try { await updateDoc(doc(db, 'proformas', p.id), { estado: 'anulada' }) } catch (e) { setError(mensajeError(e)) }
  }
  const vendidosYa = p.items.filter((i) => i.productoId && ctx.productos.find((x) => x.id === i.productoId)?.estado === 'vendido')

  return (
    <Hoja titulo={`Proforma ${p.numero}`} onCerrar={onCerrar}>
      <div className="fila">
        <span className={`pill ${ESTADO_PROFORMA[p.estado][1]}`}>{ESTADO_PROFORMA[p.estado][0]}</span>
        {p.creada && <span className="pill p-gris">{fechaCorta(p.creada.toDate())}</span>}
        {ctx.admin && <span className="pill p-gris">{p.vendedorNombre}</span>}
      </div>
      <div className="panel">
        <h3>{p.cliente.nombre || 'Sin nombre'}</h3>
        {p.items.map((i, n) => (
          <div key={n} className="fila" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <span>{i.cantidad > 1 ? `${i.cantidad} × ` : ''}{i.descripcion}</span><b>{dinero(i.precio * i.cantidad, p.moneda)}</b>
          </div>
        ))}
        {p.descuento > 0 && <div className="fila" style={{ justifyContent: 'space-between' }}><span>Descuento</span><b>− {dinero(p.descuento, p.moneda)}</b></div>}
        <div className="fila" style={{ justifyContent: 'space-between', fontSize: '1.2rem' }}><b>Total</b><b>{dinero(totalProforma(p), p.moneda)}</b></div>
      </div>
      {abierta && vendidosYa.length > 0 && <p className="aviso">Ojo: {vendidosYa.map((i) => i.descripcion).join(', ')} ya aparece como vendido.</p>}
      {error && <p className="error">{error}</p>}
      <div className="fila">
        <a className="btn btn-whatsapp" href={enlaceWhatsApp(p.cliente.telefono, texto)} target="_blank" rel="noreferrer" onClick={marcarEnviada}>{ICONOS.whatsapp}Enviar por WhatsApp</a>
        <a className="btn btn-borde" href={url} target="_blank" rel="noreferrer" onClick={marcarEnviada}>{ICONOS.imprimir}Ver e imprimir</a>
      </div>
      {p.estado === 'vendida' && ctx.admin && (
        <div className="fila">
          <button className="btn btn-borde" disabled={trabajando} onClick={deshacerVenta}>Deshacer venta</button>
        </div>
      )}
      {abierta && (
        <div className="fila">
          <button className="btn btn-principal" disabled={trabajando} onClick={vender}>Se vendió</button>
          <button className="btn btn-borde" onClick={onEditar}>Editar</button>
          <button className="btn btn-rosa btn-chico" onClick={anular}>Anular</button>
        </div>
      )}
    </Hoja>
  )
}
