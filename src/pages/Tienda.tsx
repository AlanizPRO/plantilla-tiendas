import type { User } from 'firebase/auth'
import { orderBy, query } from 'firebase/firestore'
import { useState, type ReactNode } from 'react'
import { tiene } from '../cliente'
import { Barra, Encabezado, type Pestana } from '../componentes'
import { col, todos, useAjustesConEstado, useLista, type Ajustes as TAjustes, type Producto, type Seleccion, type Vitrina } from '../datos'
import { ICONOS } from '../iconos'
import { salir } from '../sesion'
import { T } from '../textos'
import Ajustes from './Ajustes'
import Equipo from './Equipo'
import Inicio from './Inicio'
import Inventario from './Inventario'
import Ventas from './Ventas'
import Vitrinas from './Vitrinas'

type Vista = 'inicio' | 'vitrinas' | 'inventario' | 'ventas' | 'mas' | 'equipo' | 'ajustes'

// Lo que comparten todas las pantallas de la tienda.
export type Contexto = {
  admin: boolean; uid: string; nombre: string; telefono: string
  ajustes: TAjustes; productos: Producto[]; vitrinas: Vitrina[]
}

export default function Tienda({ usuario, admin, nombre, telefono, botonTema }: { usuario: User; admin: boolean; nombre: string; telefono: string; botonTema: ReactNode }) {
  const [vista, setVista] = useState<Vista>('inicio')
  const [accion, setAccion] = useState('')
  const [ajustes, ajustesCargados] = useAjustesConEstado()
  const productos = useLista<Producto>(todos('productos')) ?? []
  const vitrinas = (useLista<Vitrina>(query(col('vitrinas'), orderBy('orden'))) ?? [])
  const selecciones = useLista<Seleccion>(todos('selecciones')) ?? []
  const respondidas = selecciones.filter((s) => s.estado === 'respondida' && (admin || s.vendedorUid === usuario.uid))

  const ctx: Contexto = { admin, uid: usuario.uid, nombre: nombre || usuario.displayName || '', telefono: admin ? ajustes.telefono : telefono || ajustes.telefono, ajustes, productos, vitrinas }
  const ir = (v: string, a = '') => { setVista(v as Vista); setAccion(a); scrollTo(0, 0) }
  const pestanas: Pestana[] = [
    { id: 'inicio', nombre: 'Inicio', icono: 'inicio' },
    ...(tiene('ubicaciones') ? [{ id: 'vitrinas', nombre: T.Ubicaciones, icono: 'vitrinas' }] : []),
    { id: 'inventario', nombre: T.Productos, icono: 'inventario' },
    ...(tiene('selecciones') || tiene('proformas') ? [{ id: 'ventas', nombre: 'Ventas', icono: 'ventas', punto: respondidas.length > 0 }] : []),
    { id: 'mas', nombre: 'Más', icono: 'mas' },
  ]
  const actual = ['equipo', 'ajustes'].includes(vista) ? 'mas' : vista

  return (
    <>
      <div className="app">
        <Encabezado subtitulo={admin ? 'Dueño' : `Vendedor · ${ctx.nombre.split(' ')[0]}`} derecha={botonTema} />
        <main>
          {vista === 'inicio' && <Inicio ctx={ctx} selecciones={selecciones} onIr={ir} />}
          {vista === 'vitrinas' && <Vitrinas ctx={ctx} />}
          {vista === 'inventario' && <Inventario key={accion} ctx={ctx} nuevo={accion === 'nuevo'} />}
          {vista === 'ventas' && <Ventas key={accion} ctx={ctx} selecciones={selecciones} accion={accion} />}
          {vista === 'equipo' && admin && <Equipo />}
          {vista === 'ajustes' && admin && <Ajustes key={ajustesCargados ? 'cargado' : 'inicial'} ajustes={ajustes} />}
          {vista === 'mas' && (
            <section className="pantalla">
              <h1>Más</h1>
              <div className="lista">
                {admin && <Opcion icono="equipo" titulo="Vendedores" texto="Invitar y quitar vendedores" onClick={() => ir('equipo')} />}
                {admin && <Opcion icono="ajustes" titulo="Ajustes" texto="Datos de la tienda, estilos y proformas" onClick={() => ir('ajustes')} />}
              </div>
              <p className="suave chico">Entraste como <b>{usuario.email}</b>{admin ? ' (dueño)' : ''}.</p>
              <button className="btn btn-borde" onClick={salir}>Cerrar sesión</button>
            </section>
          )}
        </main>
      </div>
      <Barra pestanas={pestanas} actual={actual} onIr={(v) => ir(v)} />
    </>
  )
}

function Opcion({ icono, titulo, texto, onClick }: { icono: string; titulo: string; texto: string; onClick: () => void }) {
  return (
    <button className="fila-item" onClick={onClick}>
      <span className="ini" style={{ background: 'var(--principal)' }}>{ICONOS[icono]}</span>
      <div><b>{titulo}</b><small>{texto}</small></div>
      <span aria-hidden="true">›</span>
    </button>
  )
}
