import { tiene } from '../cliente'
import { fechaCorta, nombreProducto, type Seleccion } from '../datos'
import { T } from '../textos'
import type { Contexto } from './Tienda'

export default function Inicio({ ctx, selecciones, onIr }: { ctx: Contexto; selecciones: Seleccion[]; onIr: (v: string, accion?: string) => void }) {
  const { productos, admin, uid } = ctx
  const enVitrina = productos.filter((p) => p.estado === 'exhibicion').length
  const enBodega = productos.filter((p) => p.estado === 'bodega').length
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
  const vendidosMes = productos.filter((p) => p.estado === 'vendido' && (p.vendidoEn?.toMillis() ?? 0) >= +inicioMes).length
  const mias = selecciones.filter((s) => admin || s.vendedorUid === uid)
  const respondidas = mias.filter((s) => s.estado === 'respondida')

  return (
    <section className="pantalla">
      <div><h1>Hola{ctx.nombre ? `, ${ctx.nombre.split(' ')[0]}` : ''}</h1><p className="suave">{ctx.ajustes.nombreTienda}</p></div>
      <div className="stats">
        <button className="stat" onClick={() => onIr(tiene('ubicaciones') ? 'vitrinas' : 'inventario')} style={{ textAlign: 'left' }}><b>{enVitrina}</b><span>En {T.ubicaciones}</span></button>
        <button className="stat" onClick={() => onIr('inventario')} style={{ textAlign: 'left' }}><b>{enBodega}</b><span>En bodega</span></button>
        <button className="stat" onClick={() => onIr('inventario')} style={{ textAlign: 'left' }}><b>{vendidosMes}</b><span>Vendid{T.p}s este mes</span></button>
      </div>

      {respondidas.length > 0 && (
        <div className="panel">
          <h3>Clientes que ya eligieron</h3>
          <div className="lista">
            {respondidas.map((s) => {
              const elegidos = s.items.filter((i) => s.elegidos.includes(i.id))
              return (
                <button key={s.id} className="fila-item" onClick={() => onIr('ventas', `seleccion:${s.id}`)}>
                  {elegidos[0]?.miniatura ? <img className="mini" src={elegidos[0].miniatura} alt="" /> : <span className="ini">♥</span>}
                  <div><b>{s.cliente.nombre}</b><small>Le gustó: {elegidos.map(nombreProducto).join(', ') || 'ninguno'}{s.respondida ? ` · ${fechaCorta(s.respondida.toDate())}` : ''}</small></div>
                  <span className="pill p-rosa">Nuevo</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <h3>Atender a un cliente</h3>
        <p className="suave chico">Elige unos {T.productos}, mándale el enlace por WhatsApp y él marca el que le gustó. Después le haces la proforma.</p>
        <div className="fila">
          {tiene('selecciones') && <button className="btn btn-principal" onClick={() => onIr('ventas', 'nueva-seleccion')}>Nueva selección</button>}
          {tiene('proformas') && <button className="btn btn-borde" onClick={() => onIr('ventas', 'nueva-proforma')}>Nueva proforma</button>}
          {admin && <button className="btn btn-borde" onClick={() => onIr('inventario', 'nuevo')}>{T.nuevoProducto}</button>}
        </div>
      </div>

      {admin && productos.length === 0 && (
        <div className="panel destacado">
          <h3>Primeros pasos</h3>
          <p className="suave">1. Pon el teléfono y los estilos en Ajustes. 2. Crea tus {T.ubicaciones}. 3. Agrega tus {T.productos} con foto. 4. Invita a tus vendedores.</p>
        </div>
      )}
    </section>
  )
}
