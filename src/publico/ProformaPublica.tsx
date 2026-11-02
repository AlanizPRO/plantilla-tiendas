import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Logo } from '../componentes'
import { AJUSTES_INICIALES, dinero, enlaceWhatsApp, sumarDias, totalProforma, type Ajustes, type Proforma } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'

const fechaLarga = (d: Date) => d.toLocaleDateString('es-NI', { day: 'numeric', month: 'long', year: 'numeric' })

// Proforma que ve el cliente; se puede imprimir o guardar como PDF.
export default function ProformaPublica({ codigo }: { codigo: string }) {
  const [p, setP] = useState<Proforma | null | undefined>(undefined)
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_INICIALES)

  useEffect(() => {
    getDoc(doc(db, 'ajustes', 'general')).then((d) => { if (d.exists()) setAjustes({ ...AJUSTES_INICIALES, ...d.data() }) }).catch(() => {})
    getDoc(doc(db, 'proformas', codigo)).then((d) => setP(d.exists() ? ({ id: d.id, ...d.data() } as Proforma) : null)).catch(() => setP(null))
  }, [codigo])

  if (p === undefined) return <div className="entrada"><p className="suave">Cargando…</p></div>
  if (p === null) return <div className="entrada"><div className="panel"><Logo /><h2>No encontramos esta proforma</h2><p className="suave">Revisa el enlace o pide uno nuevo a la tienda.</p></div></div>

  const fecha = p.creada?.toDate() ?? new Date()
  const subtotal = p.items.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const telefono = ajustes.telefono

  return (
    <div className="app publico">
      <div className="proforma panel">
        <div className="top">
          <div className="marca"><Logo /><div><h2>{ajustes.nombreTienda}</h2>
            <small className="suave">{[ajustes.direccion, telefono].filter(Boolean).join(' · ')}</small></div></div>
          <div style={{ textAlign: 'right' }}><span className="etiqueta">Proforma</span><p><b>{p.numero}</b></p></div>
        </div>
        {p.estado === 'anulada' && <p className="error">Esta proforma fue anulada.</p>}
        {p.estado === 'vendida' && <p className="ok">Venta realizada. ¡Gracias por tu compra!</p>}
        <div className="fila" style={{ justifyContent: 'space-between' }}>
          <span><span className="suave">Cliente:</span> <b>{p.cliente.nombre || '—'}</b></span>
          <span><span className="suave">Fecha:</span> {fechaLarga(fecha)}</span>
        </div>
        <table className="tabla">
          <thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
          <tbody>
            {p.items.map((i, n) => (
              <tr key={n}>
                <td><div className="fila" style={{ flexWrap: 'nowrap' }}>{i.miniatura && <img className="mini" src={i.miniatura} alt="" />}<span>{i.descripcion}</span></div></td>
                <td>{i.cantidad}</td><td>{dinero(i.precio, p.moneda)}</td><td>{dinero(i.precio * i.cantidad, p.moneda)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {p.descuento > 0 && <tr><td colSpan={3}>Subtotal</td><td>{dinero(subtotal, p.moneda)}</td></tr>}
            {p.descuento > 0 && <tr><td colSpan={3}>Descuento</td><td>− {dinero(p.descuento, p.moneda)}</td></tr>}
            <tr className="total"><td colSpan={3}>Total</td><td>{dinero(totalProforma(p), p.moneda)}</td></tr>
          </tfoot>
        </table>
        <div className="chico">
          {p.estado !== 'vendida' && <p>Válida hasta el {fechaLarga(sumarDias(fecha, p.validezDias))}.</p>}
          {p.garantia && <p>Garantía: {p.garantia}</p>}
          {p.nota && <p className="suave" style={{ whiteSpace: 'pre-wrap' }}>{p.nota}</p>}
          <p className="suave">Te atendió: {p.vendedorNombre}</p>
        </div>
      </div>
      <div className="fila no-imprimir">
        <button className="btn btn-principal" onClick={() => print()}>{ICONOS.imprimir}Imprimir o guardar PDF</button>
        {telefono && <a className="btn btn-whatsapp" href={enlaceWhatsApp(telefono, `Hola, tengo una consulta sobre la proforma ${p.numero}.`)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Escribir a la tienda</a>}
      </div>
    </div>
  )
}
