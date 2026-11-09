import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Hoja, Logo } from '../componentes'
import { AJUSTES_INICIALES, dinero, enlaceWhatsApp, nombreProducto, type Ajustes, type Producto } from '../datos'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../firebase'
import { ICONOS } from '../iconos'
import { Galeria } from '../pages/Inventario'
import { temaActual, type Colgante } from '../temasCatalogo'
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
  // Enlace de un producto recomendado por el vendedor: /catalogo?reloj=ID. Primero se ve ese, con botón para ver todo.
  const [recomendadoId, setRecomendadoId] = useState(() => new URLSearchParams(location.search).get('reloj') ?? '')
  const [foto, setFoto] = useState('')
  // Si quien abre el catálogo tiene sesión en la app (dueño o colaborador), ve botones para mandarlo a sus clientes.
  const [equipo, setEquipo] = useState(false)
  // Su WhatsApp va en el enlace de cada producto que manda (&v=…), para que el cliente le responda a él y no a la tienda.
  const [miTelefono, setMiTelefono] = useState('')
  useEffect(() => onAuthStateChanged(auth, (u) => {
    setEquipo(!!u)
    if (u) getDoc(doc(db, 'usuarios', u.uid)).then((d) => setMiTelefono(String(d.data()?.telefono ?? '').replace(/\D/g, ''))).catch(() => {})
  }), [])
  const telefonoVendedor = (new URLSearchParams(location.search).get('v') ?? '').replace(/\D/g, '')

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
  const tema = temaActual(prueba ?? ajustes?.catalogoTema ?? 'auto', new Date(), !!ajustes?.catalogoFondos?.propio)
  const precios = ajustes?.catalogoPrecios !== false
  const conFoto = !!(tema && ajustes?.catalogoFondos?.[tema.id])

  // Si el dueño subió su propia foto para este tema, se usa en vez del dibujo.
  useEffect(() => {
    if (!tema || !conFoto) { setFoto(''); return }
    getDoc(doc(db, 'fondos', tema.id)).then((d) => setFoto((d.data()?.imagen as string) ?? '')).catch(() => setFoto(''))
  }, [tema?.id, conFoto])

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

  const responderA = telefonoVendedor || ajustes.telefono
  const meGusta = (p: Producto) => `¡Me gusta mucho! ${nombreProducto(p)}${p.codigo ? ` (código ${p.codigo})` : ''}${p.color ? `, color ${p.color}` : ''}${precios ? `, ${dinero(p.precio, ajustes.moneda)}` : ''}. ¿Está disponible?`
  const meInteresa = (p: Producto) => `Hola, me interesa ${nombreProducto(p)}${p.codigo ? ` (código ${p.codigo})` : ''}${p.color ? `, color ${p.color}` : ''} que vi en el catálogo.`

  const enlace = `${location.origin}/catalogo`
  const textoCatalogo = `Hola, te comparto nuestro catálogo de ${ajustes.nombreTienda}. Ahí puedes ver lo que tenemos disponible con sus fotos${precios ? ' y precios' : ''}: ${enlace}`
  const textoReloj = (p: Producto) => `Hola, te comparto esto: ${nombreProducto(p)}${p.codigo ? ` (código ${p.codigo})` : ''}${p.color ? `, color ${p.color}` : ''}${precios ? `, ${dinero(p.precio, ajustes.moneda)}` : ''}. Míralo aquí: ${enlace}?reloj=${p.id}${miTelefono ? `&v=${miTelefono}` : ''}`
  const verTodo = () => {
    setRecomendadoId('')
    const u = new URL(location.href); u.searchParams.delete('reloj'); history.replaceState(null, '', u)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const recomendado = recomendadoId ? productos.find((p) => p.id === recomendadoId) : undefined
  const detalle = (p: Producto) => (
    <>
      <div className="panel">
        {precios && <p style={{ fontSize: '1.3rem', fontWeight: 800 }}>{dinero(p.precio, ajustes.moneda)}</p>}
        {[['Código', p.codigo], ['Estilo', p.estilo], ['Material', p.material], ['Color', p.color]].filter(([, v]) => v).map(([k, v]) => <p key={k}><b>{k}:</b> {v}</p>)}
        {p.descripcion && <p className="suave">{p.descripcion}</p>}
      </div>
      {p.id === recomendadoId ? (
        // Producto que el vendedor le recomendó: el cliente le responde a ese vendedor.
        <>
          {responderA && <a className="btn btn-whatsapp cat-me-gusta" href={enlaceWhatsApp(responderA, meGusta(p))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}¡Me gusta mucho!</a>}
          {equipo && <a className="btn btn-borde" href={enlaceWhatsApp('', textoReloj(p))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Enviar a otro cliente</a>}
        </>
      ) : equipo
        ? <a className="btn btn-whatsapp" href={enlaceWhatsApp('', textoReloj(p))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Enviar a un cliente</a>
        : responderA && <a className="btn btn-whatsapp" href={enlaceWhatsApp(responderA, meInteresa(p))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Me interesa</a>}
    </>
  )
  const mensaje = ajustes.catalogoMensaje?.trim() || tema?.mensaje || 'Nuestra colección'
  const color = foto ? '#ffffff' : tema?.texto
  const capa = foto ? { background: `linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.55)), url(${foto}) center / cover` }
    : tema ? { backgroundImage: tema.fondo } : undefined

  return (
    <div className={`catalogo-fondo${tema || foto ? ' con-tema' : ''}`} style={{ '--acento': tema?.acento ?? 'var(--principal)' } as CSSProperties}>
      {capa && <div className="cat-capa" style={capa} aria-hidden="true" />}
      {tema && !foto && <div className="cat-capa cat-adornos" style={{ backgroundImage: tema.adornos }} aria-hidden="true" />}
      <div className="app publico">
        <header className="cat-portada" style={{ color }}>
          {tema && !foto && <Colgantes tipo={tema.colgante} colores={tema.colores} />}
          <div className="cat-marca"><Logo /><span>{ajustes.nombreTienda}</span></div>
          <h1 className={tema?.titulo ? 'cat-titulo' : 'cat-titulo cat-titulo-tienda'}>{tema?.titulo || ajustes.nombreTienda}</h1>
          <p className="cat-mensaje">{mensaje}</p>
          <span className="cat-raya" aria-hidden="true" />
        </header>
        {recomendadoId ? (
          <>
            <div className="panel cat-recomendado">
              <small className="cat-etiqueta">Te recomendamos</small>
              {recomendado ? <h2>{nombreProducto(recomendado)}</h2> : <h2>Esto ya no está disponible</h2>}
              {!recomendado && <p className="suave">Puede que ya se haya vendido. Mira los demás, seguro encuentras algo para ti.</p>}
            </div>
            {recomendado && <div className="panel"><Galeria ids={recomendado.fotos} miniatura={recomendado.miniatura} /></div>}
            {recomendado && detalle(recomendado)}
            <button className="btn btn-principal cat-ver-todo" onClick={verTodo}>Ver todo el catálogo ({productos.length})</button>
          </>
        ) : (
          <>
          {equipo && (
            <div className="panel cat-equipo">
              <a className="btn btn-whatsapp" href={enlaceWhatsApp('', textoCatalogo)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Enviar catálogo a un cliente</a>
              <small className="suave">Solo tú ves este botón porque entraste con tu cuenta. Tus clientes ven el catálogo sin él.</small>
            </div>
          )}
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
                {precios && <span className="cat-precio">{dinero(p.precio, ajustes.moneda)}</span>}
              </button>
            ))}
          </div>
          {equipo ? (
            <div className="panel">
              <p>¿Ya elegiste a quién mandárselo?</p>
              <a className="btn btn-whatsapp" href={enlaceWhatsApp('', textoCatalogo)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Enviar catálogo a un cliente</a>
            </div>
          ) : responderA && (
            <div className="panel">
              <p>¿Buscas algo que no ves aquí? Escríbenos.</p>
              <a className="btn btn-whatsapp" href={enlaceWhatsApp(responderA, 'Hola, vi el catálogo y tengo una pregunta.')} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Escribir a la tienda</a>
            </div>
          )}
          </>
        )}
        {abierto && (
          <Hoja titulo={nombreProducto(abierto)} onCerrar={() => setAbierto(null)}>
            <Galeria ids={abierto.fotos} miniatura={abierto.miniatura} />
            {detalle(abierto)}
          </Hoja>
        )}
      </div>
    </div>
  )
}

// Adornos que cuelgan de hilos arriba de la portada (esferas en Navidad, corazones en San Valentín, etc.).
export function Colgantes({ tipo, colores }: { tipo: Colgante; colores: string[] }) {
  if (tipo === 'ninguno' || !colores.length) return null
  if (tipo === 'bandera') {
    // Banderines azul y blanco en una cuerda curva.
    const n = 13
    return (
      <svg className="cat-colgantes" viewBox="0 0 360 70" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 6 Q180 46 360 6" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.2" />
        {Array.from({ length: n }, (_, i) => {
          const x = 8 + i * (344 / (n - 1)), t = x / 360, y = 6 + 40 * 2 * t * (1 - t) * 1
          return <path key={i} d={`M${x - 11} ${y} L${x + 11} ${y} L${x} ${y + 24} Z`} fill={colores[i % colores.length]} stroke="rgba(0,0,0,.12)" strokeWidth=".6" />
        })}
      </svg>
    )
  }
  const largos = [26, 52, 18, 66, 34, 58, 22, 46, 30]
  return (
    <svg className="cat-colgantes" viewBox="0 0 360 100" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
      {largos.map((l, i) => {
        const x = 20 + i * 40, c = colores[i % colores.length]
        return (
          <g key={i}>
            <line x1={x} y1={0} x2={x} y2={l} stroke="currentColor" strokeOpacity=".45" strokeWidth=".8" />
            <g transform={`translate(${x} ${l})`}>{figura(tipo, c, i)}</g>
          </g>
        )
      })}
    </svg>
  )
}

function figura(tipo: Colgante, c: string, i: number) {
  const brillo = <ellipse cx={-3.5} cy={7} rx={2.6} ry={4} fill="#fff" opacity=".45" transform="rotate(25 -3.5 7)" />
  switch (tipo) {
    case 'esfera': {
      const r = i % 3 === 0 ? 12 : 9.5
      return <g><rect x={-3} y={-1} width={6} height={4} rx={1} fill="#c9a227" /><circle cy={3 + r} r={r} fill={c} stroke="rgba(0,0,0,.18)" strokeWidth=".6" />
        <ellipse cx={-r / 3} cy={3 + r * .6} rx={r / 4} ry={r / 2.6} fill="#fff" opacity=".5" transform={`rotate(30 ${-r / 3} ${3 + r * .6})`} /></g>
    }
    case 'corazon':
      return <g transform={`scale(${i % 3 === 0 ? 1.15 : .85})`}><path d="M0 22C-12 14-14 6-10 2c3-3 7.5-2 10 1.6C2.5 0 7-1 10 2c4 4 2 12-10 20z" fill={c} stroke="rgba(0,0,0,.15)" strokeWidth=".6" />{brillo}</g>
    case 'flor':
      return <g transform={`translate(0 11) scale(${i % 3 === 0 ? 1.2 : .9})`}>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-6} rx={4} ry={6.5} fill={c} opacity=".95" transform={`rotate(${a})`} />)}<circle r={3.2} fill="#f7d36b" /></g>
    case 'estrella':
      return <g transform={`translate(0 11) scale(${i % 3 === 0 ? 1.25 : .9})`}><path d="M0-11l3.2 6.9 7.5.8-5.6 5.1 1.6 7.4L0 5.4l-6.7 3.8 1.6-7.4-5.6-5.1 7.5-.8z" fill={c} stroke="rgba(0,0,0,.2)" strokeWidth=".5" /></g>
    case 'etiqueta':
      return <g transform={`rotate(${i % 2 ? 8 : -8}) scale(${i % 3 === 0 ? 1.15 : .9})`}><path d="M-9 4h18v20l-9 6-9-6z" fill={c} stroke="#d4af37" strokeWidth=".8" /><circle cy={8} r={1.8} fill="none" stroke="#d4af37" strokeWidth=".8" />
        <text y={21} textAnchor="middle" fontSize="8" fontWeight="800" fill={c === '#1a1a1a' ? '#d4af37' : '#1a1a1a'}>%</text></g>
    default: return null
  }
}
