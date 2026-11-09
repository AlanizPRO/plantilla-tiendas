import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { Hoja, Logo } from '../componentes'
import { AJUSTES_INICIALES, dinero, enlaceWhatsApp, nombreProducto, type Ajustes, type Producto } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { Galeria } from '../pages/Inventario'
import { temaActual } from '../temasCatalogo'
import { T } from '../textos'

// Catálogo en línea para compartir con los clientes: /catalogo. No necesita cuenta.
// Muestra lo disponible (en exhibición o en bodega), con el fondo de temporada que eligió el dueño.
// Para ver un fondo antes de activarlo: /catalogo?tema=navidad
export default function CatalogoPublico() {
  const [ajustes, setAjustes] = useState<Ajustes | null>(null)
  const [productos, setProductos] = useState<Producto[] | null>(null)
  const [buscar, setBuscar] = useState('')
  const [estilo, setEstilo] = useState('')
  const [abierto, setAbierto] = useState<Producto | null>(null)

  useEffect(() => {
    getDoc(doc(db, 'ajustes', 'general'))
      .then((d) => {
        const a = { ...AJUSTES_INICIALES, ...(d.exists() ? d.data() : {}) } as Ajustes
        setAjustes(a)
        if (!a.catalogo) { setProductos([]); return }
        return getDocs(query(collection(db, 'productos'), where('estado', 'in', ['exhibicion', 'bodega'])))
          .then((r) => setProductos(r.docs.map((x) => ({ id: x.id, ...x.data() }) as Producto)
            .sort((x, y) => nombreProducto(x).localeCompare(nombreProducto(y)))))
      })
      .catch(() => { setAjustes((x) => x ?? AJUSTES_INICIALES); setProductos([]) })
  }, [])

  const prueba = new URLSearchParams(location.search).get('tema') ?? undefined
  const tema = temaActual(prueba ?? ajustes?.catalogoTema ?? 'auto')
  const precios = ajustes?.catalogoPrecios !== false

  const estilos = useMemo(() => [...new Set((productos ?? []).map((p) => p.estilo).filter(Boolean))] as string[], [productos])
  const lista = useMemo(() => (productos ?? []).filter((p) => (!estilo || p.estilo === estilo)
    && `${p.marca} ${p.modelo} ${p.codigo ?? ''} ${p.color ?? ''} ${p.estilo ?? ''}`.toLowerCase().includes(buscar.trim().toLowerCase())), [productos, buscar, estilo])

  if (!ajustes || productos === null) return <div className="entrada"><p className="suave">Cargando el catálogo…</p></div>
  if (!ajustes.catalogo) {
    return (
      <div className="entrada"><div className="panel"><Logo /><h2>El catálogo no está disponible por ahora</h2>
        <p className="suave">Escríbenos y con gusto te mandamos fotos.</p>
        {ajustes.telefono && <a className="btn btn-whatsapp" href={enlaceWhatsApp(ajustes.telefono, 'Hola, quisiera ver el catálogo.')}>{ICONOS.whatsapp}Escribir a la tienda</a>}
      </div></div>
    )
  }

  const meInteresa = (p: Producto) => `Hola, me interesa ${nombreProducto(p)}${p.codigo ? ` (código ${p.codigo})` : ''}${p.color ? `, color ${p.color}` : ''} que vi en el catálogo.`

  return (
    <div className="catalogo-fondo" style={tema ? { backgroundImage: tema.fondo } : undefined}>
      <div className="app publico">
        <header className="top panel">
          <div className="marca"><Logo /><div style={{ minWidth: 0 }}><h3>{ajustes.nombreTienda}</h3><small className="suave">{ajustes.direccion}</small></div></div>
        </header>
        {tema && <div className="panel banner-tema"><b>{tema.mensaje}</b></div>}
        <div className="panel">
          <h1>Catálogo</h1>
          <p className="suave">{lista.length} {lista.length === 1 ? T.producto : T.productos} disponibles. Toca uno para ver sus fotos.</p>
          <label className="campo" htmlFor="c-buscar"><span hidden>Buscar</span>
            <input id="c-buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar marca, modelo, color o código" /></label>
          {estilos.length > 1 && (
            <div className="fila">
              <button className={`pill ${!estilo ? 'p-principal' : 'p-gris'}`} onClick={() => setEstilo('')}>Todos</button>
              {estilos.map((e) => <button key={e} className={`pill ${estilo === e ? 'p-principal' : 'p-gris'}`} onClick={() => setEstilo(estilo === e ? '' : e)}>{e}</button>)}
            </div>
          )}
        </div>
        {lista.length === 0 && <div className="panel vacio">No encontramos nada con esa búsqueda.</div>}
        <div className="rejilla">
          {lista.map((p) => (
            <button key={p.id} className="tarjeta" onClick={() => setAbierto(p)}>
              {p.miniatura ? <img src={p.miniatura} alt="" loading="lazy" /> : <span className="sin-foto">{ICONOS.camara}</span>}
              <b>{nombreProducto(p)}</b>
              {p.color && <small className="suave">{p.color}</small>}
              {precios && <small>{dinero(p.precio, ajustes.moneda)}</small>}
            </button>
          ))}
        </div>
        {ajustes.telefono && (
          <div className="panel">
            <p>¿Buscas algo que no ves aquí? Escríbenos.</p>
            <a className="btn btn-whatsapp" href={enlaceWhatsApp(ajustes.telefono, 'Hola, vi el catálogo y tengo una pregunta.')} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Escribir a la tienda</a>
          </div>
        )}
        {abierto && (
          <Hoja titulo={nombreProducto(abierto)} onCerrar={() => setAbierto(null)}>
            <Galeria ids={abierto.fotos} miniatura={abierto.miniatura} />
            <div className="panel">
              {precios && <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>{dinero(abierto.precio, ajustes.moneda)}</p>}
              {[['Código', abierto.codigo], ['Estilo', abierto.estilo], ['Material', abierto.material], ['Color', abierto.color]].filter(([, v]) => v).map(([k, v]) => <p key={k}><b>{k}:</b> {v}</p>)}
              {abierto.descripcion && <p className="suave">{abierto.descripcion}</p>}
            </div>
            {ajustes.telefono && <a className="btn btn-whatsapp" href={enlaceWhatsApp(ajustes.telefono, meInteresa(abierto))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Me interesa</a>}
          </Hoja>
        )}
      </div>
    </div>
  )
}
