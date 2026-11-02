import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Logo } from '../componentes'
import { AJUSTES_INICIALES, dinero, enlaceWhatsApp, fechaCorta, mensajeError, nombreProducto, type Ajustes, type Seleccion } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { Galeria } from '../pages/Inventario'
import { T } from '../textos'

// Lo que ve el cliente al abrir el enlace que le mandó el vendedor. No necesita cuenta.
export default function SeleccionPublica({ codigo }: { codigo: string }) {
  const [s, setS] = useState<Seleccion | null | undefined>(undefined)
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_INICIALES)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'ajustes', 'general')).then((d) => { if (d.exists()) setAjustes({ ...AJUSTES_INICIALES, ...d.data() }) }).catch(() => {})
    getDoc(doc(db, 'selecciones', codigo)).then((d) => {
      if (!d.exists()) { setS(null); return }
      const datos = { id: d.id, ...d.data() } as Seleccion
      setS(datos); setElegidos(datos.elegidos ?? []); setNota(datos.nota ?? '')
    }).catch(() => setS(null))
  }, [codigo])

  if (s === undefined) return <div className="entrada"><p className="suave">Cargando…</p></div>
  if (s === null) {
    return (
      <div className="entrada"><div className="panel"><Logo /><h2>Este enlace ya no está disponible</h2>
        <p className="suave">Puede que haya vencido. Escríbele a la tienda y te mandan uno nuevo.</p>
        {ajustes.telefono && <a className="btn btn-whatsapp" href={enlaceWhatsApp(ajustes.telefono, 'Hola, mi enlace de la tienda ya venció.')}>{ICONOS.whatsapp}Escribir a la tienda</a>}
      </div></div>
    )
  }

  const telefono = s.telefonoVendedor || ajustes.telefono
  const gustados = s.items.filter((i) => elegidos.includes(i.id))
  const textoVendedor = `Hola ${s.vendedorNombre.split(' ')[0]}, soy ${s.cliente.nombre}. Ya marqué lo que me gustó: ${gustados.map(nombreProducto).join(', ') || 'ninguno'}.${nota ? ` ${nota}` : ''}`

  async function enviar() {
    setEnviando(true); setError('')
    try {
      await updateDoc(doc(db, 'selecciones', codigo), { elegidos, nota: nota.trim().slice(0, 500), estado: 'respondida', respondida: serverTimestamp() })
      setEnviado(true)
    } catch (e) { setError(mensajeError(e)) } finally { setEnviando(false) }
  }

  return (
    <div className="app publico">
      <header className="top">
        <div className="marca"><Logo /><div style={{ minWidth: 0 }}><h3>{ajustes.nombreTienda}</h3><small className="suave">{ajustes.direccion}</small></div></div>
      </header>
      <div>
        <h1>Hola, {s.cliente.nombre.split(' ')[0]}</h1>
        <p className="suave">{s.vendedorNombre.split(' ')[0]} te preparó {s.items.length} opciones. Toca “Me gusta” en {s.items.length > 1 ? 'las que prefieras' : 'el que prefieras'} y envía tu elección.</p>
      </div>
      {s.items.map((i) => {
        const marcado = elegidos.includes(i.id)
        return (
          <article key={i.id} className={`panel opcion ${marcado ? 'marcada' : ''}`}>
            <Galeria ids={i.fotos} miniatura={i.miniatura} />
            <div className="fila" style={{ justifyContent: 'space-between' }}>
              <div><h2>{nombreProducto(i)}</h2>{i.estilo && <span className="suave chico">{i.estilo}</span>}</div>
              {s.mostrarPrecios && <b style={{ fontSize: '1.2rem' }}>{dinero(i.precio, ajustes.moneda)}</b>}
            </div>
            {i.descripcion && <p className="suave">{i.descripcion}</p>}
            <button className={`btn ${marcado ? 'btn-principal' : 'btn-borde'}`} aria-pressed={marcado} disabled={enviado}
              onClick={() => setElegidos(marcado ? elegidos.filter((x) => x !== i.id) : [...elegidos, i.id])}>
              {ICONOS.corazon}{marcado ? 'Me gusta ✓' : 'Me gusta'}
            </button>
          </article>
        )
      })}
      {!enviado ? (
        <div className="panel">
          <label className="campo" htmlFor="nota">¿Algo más que quieras decir? (opcional)
            <textarea id="nota" value={nota} maxLength={500} onChange={(e) => setNota(e.target.value)} placeholder={`Ej. ¿Lo tienen en otro color? ¿Hacen descuento por 2 ${T.productos}?`} /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-principal" disabled={enviando} onClick={enviar}>{enviando ? 'Enviando…' : `Enviar mi elección (${elegidos.length})`}</button>
          {s.vence && <p className="suave chico">Puedes cambiar tu elección hasta el {fechaCorta(s.vence.toDate())}.</p>}
        </div>
      ) : (
        <div className="panel">
          <p className="ok">¡Listo! {s.vendedorNombre.split(' ')[0]} ya ve lo que elegiste y te prepara la proforma.</p>
          {telefono && <a className="btn btn-whatsapp" href={enlaceWhatsApp(telefono, textoVendedor)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Avisarle por WhatsApp</a>}
          <button className="btn btn-borde" onClick={() => setEnviado(false)}>Cambiar mi elección</button>
        </div>
      )}
    </div>
  )
}
