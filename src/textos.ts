// Palabras de cada tienda: "reloj / vitrina", "lente / estante", "joya / mostrador"…
// Las escribe la Super App en src/cliente.json → "textos".
import { cliente } from './cliente'

const BASE = { producto: 'producto', productos: 'productos', productoFemenino: false, ubicacion: 'vitrina', ubicaciones: 'vitrinas', ubicacionFemenino: true }
const t = { ...BASE, ...((cliente as { textos?: Partial<typeof BASE> }).textos ?? {}) }
const may = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export const T = {
  ...t,
  Producto: may(t.producto),
  Productos: may(t.productos),
  Ubicacion: may(t.ubicacion),
  Ubicaciones: may(t.ubicaciones),
  /** "Nuevo reloj" / "Nueva joya" */
  nuevoProducto: `${t.productoFemenino ? 'Nueva' : 'Nuevo'} ${t.producto}`,
  /** "Nueva vitrina" / "Nuevo estante" */
  nuevaUbicacion: `${t.ubicacionFemenino ? 'Nueva' : 'Nuevo'} ${t.ubicacion}`,
  /** "o" / "a" para concordar con el producto */
  p: t.productoFemenino ? 'a' : 'o',
}
