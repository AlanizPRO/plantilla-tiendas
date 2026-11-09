import { doc, setDoc } from 'firebase/firestore'
import { useState } from 'react'
import { cargarInventarioInicial, inventarioInicial, marcarCargado, piezasDelExcelSinTocar, quitarRepetidos, repetidosDelExcel } from '../cargaInicial'
import { enlaceWhatsApp, mensajeError, type Ajustes as TAjustes, type Producto, type Vitrina } from '../datos'
import { db } from '../firebase'
import { CALIDADES_FOTO, CALIDAD_FOTO_INICIAL } from '../fotos'
import { T } from '../textos'
import { ICONOS } from '../iconos'
import { TEMAS, fechasTema, temaActual } from '../temasCatalogo'
import BotonRespaldo from './BotonRespaldo'

export default function Ajustes({ ajustes, productos, vitrinas }: { ajustes: TAjustes; productos: Producto[]; vitrinas: Vitrina[] }) {
  const [a, setA] = useState<TAjustes>(ajustes)
  const [nuevo, setNuevo] = useState('')
  const [estado, setEstado] = useState<'' | 'guardando' | 'ok' | string>('')
  const poner = <K extends keyof TAjustes>(k: K, v: TAjustes[K]) => { setA((x) => ({ ...x, [k]: v })); setEstado('') }

  function agregarEstilo() {
    const e = nuevo.trim()
    if (e && !a.estilos.includes(e)) poner('estilos', [...a.estilos, e])
    setNuevo('')
  }
  async function guardar() {
    setEstado('guardando')
    try {
      await setDoc(doc(db, 'ajustes', 'general'), { ...a, nombreTienda: a.nombreTienda.trim(), validezDias: Math.max(1, Number(a.validezDias) || 1) })
      setEstado('ok')
    } catch (e) { setEstado(mensajeError(e)) }
  }

  return (
    <section className="pantalla">
      <div><h1>Ajustes</h1><p className="suave">Estos datos salen en los enlaces y proformas que ve el cliente.</p></div>
      <div className="panel">
        <h3>La tienda</h3>
        <div className="campos">
          <label className="campo" htmlFor="a-nombre">Nombre<input id="a-nombre" value={a.nombreTienda} onChange={(e) => poner('nombreTienda', e.target.value)} /></label>
          <label className="campo" htmlFor="a-tel">Teléfono / WhatsApp<input id="a-tel" type="tel" inputMode="tel" value={a.telefono} onChange={(e) => poner('telefono', e.target.value)} /></label>
          <label className="campo" htmlFor="a-moneda">Moneda<input id="a-moneda" value={a.moneda} onChange={(e) => poner('moneda', e.target.value)} placeholder="C$ o US$" /></label>
          <label className="campo" htmlFor="a-cambio">Tipo de cambio (C$ por cada US$1)<input id="a-cambio" type="number" inputMode="decimal" min={0} value={a.tipoCambio ?? ''} onChange={(e) => poner('tipoCambio', Number(e.target.value) || 0)} placeholder="Ej. 36.6" /></label>
        </div>
        <label className="campo" htmlFor="a-dir">Dirección<input id="a-dir" value={a.direccion} onChange={(e) => poner('direccion', e.target.value)} /></label>
      </div>
      <div className="panel">
        <h3>Estilos</h3>
        <p className="suave chico">Sirven para filtrar rápido cuando un cliente pide "algo deportivo" o "algo elegante".</p>
        <div className="fila">
          {a.estilos.map((e) => (
            <span key={e} className="pill p-principal">{e}{' '}
              <button aria-label={`Quitar ${e}`} style={{ border: 0, background: 'transparent', color: '#fff', fontWeight: 800 }} onClick={() => poner('estilos', a.estilos.filter((x) => x !== e))}>×</button>
            </span>
          ))}
        </div>
        <form className="fila" onSubmit={(ev) => { ev.preventDefault(); agregarEstilo() }}>
          <label className="campo" style={{ flex: 1 }} htmlFor="a-estilo"><span hidden>Estilo nuevo</span>
            <input id="a-estilo" value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Ej. Vintage" /></label>
          <button className="btn btn-acento" type="submit">Agregar</button>
        </form>
      </div>
      <div className="panel">
        <h3>Proformas</h3>
        <div className="campos">
          <label className="campo" htmlFor="a-val">Válida por (días)<input id="a-val" type="number" inputMode="numeric" min={1} value={a.validezDias} onChange={(e) => poner('validezDias', Number(e.target.value))} /></label>
          <label className="campo" htmlFor="a-gar">Garantía<input id="a-gar" value={a.garantia} onChange={(e) => poner('garantia', e.target.value)} placeholder="Ej. 1 año en maquinaria" /></label>
        </div>
        <label className="campo" htmlFor="a-nota">Nota al pie<textarea id="a-nota" value={a.notaProforma} onChange={(e) => poner('notaProforma', e.target.value)} placeholder="Ej. Aceptamos tarjeta y transferencia." /></label>
      </div>
      <Catalogo a={a} poner={poner} />
      <div className="panel">
        <h3>Aviso de ventas</h3>
        <p className="suave chico">Cuando un vendedor registra una venta, le sale un botón para avisarte por WhatsApp con el mensaje ya escrito. Si lo dejas vacío, se usa el teléfono de la tienda.</p>
        <label className="campo" htmlFor="a-avisos">WhatsApp del dueño<input id="a-avisos" type="tel" inputMode="tel" value={a.whatsappAvisos ?? ''} onChange={(e) => poner('whatsappAvisos', e.target.value)} placeholder={a.telefono || 'Ej. 8888 8888'} /></label>
      </div>
      <div className="panel">
        <h3>Calidad de las fotos</h3>
        <p className="suave chico">Solo cambia las fotos nuevas. Más calidad se ve mejor al hacer zoom, pero caben menos fotos en el plan gratis.</p>
        <label className="campo" htmlFor="a-fotokb">Peso de cada foto
          <select id="a-fotokb" value={a.fotoKB ?? CALIDAD_FOTO_INICIAL} onChange={(e) => poner('fotoKB', Number(e.target.value))}>
            {CALIDADES_FOTO.map(([kb, texto]) => <option key={kb} value={kb}>{texto}</option>)}
          </select>
        </label>
      </div>
      {estado === 'ok' && <p className="ok">Guardado.</p>}
      {estado && estado !== 'ok' && estado !== 'guardando' && <p className="error">{estado}</p>}
      <button className="btn btn-principal" disabled={estado === 'guardando'} onClick={guardar}>{estado === 'guardando' ? 'Guardando…' : 'Guardar'}</button>
      <Repetidos productos={productos} />
      <RecargarExcel ajustes={ajustes} productos={productos} vitrinas={vitrinas} />
      <BotonRespaldo hojas={[
        { coleccion: 'productos', nombre: T.Productos }, { coleccion: 'costos', nombre: 'Costos' }, { coleccion: 'vitrinas', nombre: T.Ubicaciones },
        { coleccion: 'proformas', nombre: 'Proformas' }, { coleccion: 'selecciones', nombre: 'Selecciones' }, { coleccion: 'movimientos', nombre: 'Movimientos' },
        { coleccion: 'usuarios', nombre: 'Colaboradores' },
      ]} />
    </section>
  )
}

function Repetidos({ productos }: { productos: Producto[] }) {
  const [estado, setEstado] = useState('')
  const sobran = repetidosDelExcel(productos)
  if (!sobran.length && !estado) return null
  async function quitar() {
    if (!confirm(`¿Quitar ${sobran.length} ${T.productos} repetidos? Quedan los que dice el Excel.`)) return
    setEstado('quitando')
    try { setEstado(`Listo: se quitaron ${await quitarRepetidos(sobran)} repetidos.`) } catch (e) { setEstado(mensajeError(e)) }
  }
  return (
    <div className="panel">
      <h3>Inventario repetido</h3>
      {sobran.length > 0 && <p className="aviso">El inventario del Excel se cargó más de una vez: hay {sobran.length} {T.productos} de más. Se quitan los repetidos (primero los que siguen en bodega) y quedan los que dice el Excel.</p>}
      {estado && estado !== 'quitando' && <p className="ok">{estado}</p>}
      {sobran.length > 0 && <button className="btn btn-rosa" disabled={estado === 'quitando'} onClick={quitar}>{estado === 'quitando' ? 'Quitando…' : `Quitar ${sobran.length} repetidos`}</button>}
    </div>
  )
}

// Vuelve a cargar el inventario del Excel (por ejemplo, si los precios salieron mal).
// Quita solo las piezas del Excel que siguen sin tocar: sin fotos y en bodega.
function RecargarExcel({ ajustes, productos, vitrinas }: { ajustes: TAjustes; productos: Producto[]; vitrinas: Vitrina[] }) {
  const [estado, setEstado] = useState('')
  const filas = inventarioInicial().length
  if (!filas) return null
  const viejas = piezasDelExcelSinTocar(productos)
  async function recargar() {
    if (!confirm(`¿Volver a cargar el inventario del Excel? Se quitan ${viejas.length} ${T.productos} del Excel que siguen en bodega y sin fotos, y se cargan de nuevo. Los que ya moviste o tienen fotos se quedan.`)) return
    setEstado('cargando')
    try {
      await quitarRepetidos(viejas)
      const n = await cargarInventarioInicial(ajustes, vitrinas)
      await marcarCargado()
      setEstado(`Listo: se cargaron ${n} ${T.productos} del Excel.`)
    } catch (e) { setEstado(mensajeError(e)) }
  }
  return (
    <div className="panel">
      <h3>Inventario del Excel</h3>
      <p className="suave chico">El Excel trae {filas} filas. Si algo salió mal (precios, repetidos), vuelve a cargarlo. Antes, si cambiaste el Excel, súbelo otra vez en la Super App y actualiza la app.</p>
      {estado && estado !== 'cargando' && <p className="ok">{estado}</p>}
      <button className="btn btn-borde" disabled={estado === 'cargando'} onClick={recargar}>{estado === 'cargando' ? 'Cargando…' : 'Volver a cargar el inventario del Excel'}</button>
    </div>
  )
}

// Catálogo en línea: encenderlo, elegir el fondo de temporada y compartir el enlace.
function Catalogo({ a, poner }: { a: TAjustes; poner: <K extends keyof TAjustes>(k: K, v: TAjustes[K]) => void }) {
  const url = `${location.origin}/catalogo`
  const elegido = a.catalogoTema ?? 'auto'
  const hoy = temaActual(elegido)
  const verTema = elegido === 'auto' || elegido === 'ninguno' ? url : `${url}?tema=${elegido}`
  return (
    <div className="panel">
      <h3>Catálogo en línea</h3>
      <p className="suave chico">Una página con las fotos y precios de lo que está en exhibición y en bodega (no salen los vendidos ni los apartados), para mandársela a tus clientes. Se actualiza sola cuando agregas o vendes.</p>
      <label className="fila" htmlFor="a-catalogo"><input id="a-catalogo" type="checkbox" checked={!!a.catalogo} onChange={(e) => poner('catalogo', e.target.checked)} /> Catálogo encendido</label>
      <label className="fila" htmlFor="a-cat-precios"><input id="a-cat-precios" type="checkbox" checked={a.catalogoPrecios !== false} onChange={(e) => poner('catalogoPrecios', e.target.checked)} /> Mostrar precios</label>
      <label className="campo" htmlFor="a-cat-tema">Fondo de la página
        <select id="a-cat-tema" value={elegido} onChange={(e) => poner('catalogoTema', e.target.value)}>
          <option value="auto">Automático según la fecha</option>
          <option value="ninguno">Sin fondo especial (colores de la tienda)</option>
          {TEMAS.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </label>
      {elegido === 'auto' && <p className="suave chico">Hoy se ve: <b>{hoy ? hoy.nombre : 'sin fondo especial'}</b>. Fechas: {TEMAS.map((t) => `${t.nombre} ${fechasTema(t)}`).join(' · ')}.</p>}
      <p className="suave chico">Después de cambiar algo, toca <b>Guardar</b> abajo.</p>
      <div className="fila">
        <a className="btn btn-borde" href={verTema} target="_blank" rel="noreferrer">{ICONOS.enlace}Ver catálogo</a>
        <a className="btn btn-whatsapp" href={enlaceWhatsApp('', `Mira nuestro catálogo de ${a.nombreTienda}: ${url}`)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Compartir</a>
      </div>
    </div>
  )
}
