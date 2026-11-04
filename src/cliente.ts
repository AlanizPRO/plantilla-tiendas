// Datos de esta tienda. Los escribe la Super App en src/cliente.json.
import datos from './cliente.json'

export type Modulo = 'inventario' | 'ubicaciones' | 'selecciones' | 'proformas'

export const cliente = datos
// Dueño principal y dueños extra (correosAdmin). Todos ven y editan todo.
export const correosAdmin = [
  datos.correoAdmin,
  ...((datos as { correosAdmin?: string[] }).correosAdmin ?? []),
].map((c) => String(c).trim().toLowerCase()).filter((c, i, lista) => c && lista.indexOf(c) === i)
export const correoAdmin = correosAdmin[0] ?? ''
export const tiene = (m: Modulo) => (datos.modulos as string[]).includes(m)
