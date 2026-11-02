// Datos de esta tienda. Los escribe la Super App en src/cliente.json.
import datos from './cliente.json'

export type Modulo = 'inventario' | 'ubicaciones' | 'selecciones' | 'proformas'

export const cliente = datos
export const correoAdmin = datos.correoAdmin.trim().toLowerCase()
export const tiene = (m: Modulo) => (datos.modulos as string[]).includes(m)
