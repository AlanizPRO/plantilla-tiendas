import {
  collection, doc, onSnapshot, query, type DocumentData, type Query, type Timestamp,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { cliente } from './cliente'
import { db } from './firebase'

// ---------- Tipos ----------
export type Estado = 'exhibicion' | 'bodega' | 'apartado' | 'vendido'
export type Vitrina = { id: string; nombre: string; segmentos: string[]; orden?: number }
export type Producto = {
  id: string; marca: string; modelo: string; codigo?: string; estilo?: string; material?: string; color?: string
  descripcion?: string; precio: number; miniatura?: string; fotos?: string[]
  estado: Estado; vitrinaId?: string; segmento?: string; actualizado?: Timestamp; vendidoEn?: Timestamp
}
export type Foto = { id: string; datos: string; productoId: string }
export type ItemSeleccion = { id: string; marca: string; modelo: string; estilo?: string; precio: number; miniatura?: string; fotos?: string[]; descripcion?: string }
export type Seleccion = {
  id: string; vendedorUid: string; vendedorNombre: string; telefonoVendedor?: string
  cliente: { nombre: string; telefono?: string }; mostrarPrecios: boolean; items: ItemSeleccion[]
  elegidos: string[]; nota: string; estado: 'enviada' | 'respondida' | 'atendida'
  creada?: Timestamp; vence?: Timestamp; respondida?: Timestamp
}
export type ItemProforma = { productoId?: string; descripcion: string; precio: number; cantidad: number; miniatura?: string }
export type Proforma = {
  id: string; numero: string; cliente: { nombre: string; telefono?: string }; items: ItemProforma[]
  descuento: number; moneda: string; validezDias: number; garantia: string; nota: string
  estado: 'borrador' | 'enviada' | 'vendida' | 'anulada'; seleccionId?: string
  vendedorUid: string; vendedorNombre: string; creada?: Timestamp; vendidaEn?: Timestamp
  /** Etapa del tablero: 'proforma' | 'aceptada' | 'reparto' | 'finalizada' */
  etapa?: 'proforma' | 'aceptada' | 'reparto' | 'finalizada'
}
export type Movimiento = { id: string; productoId: string; de: string; a: string; por: string; fecha?: Timestamp; enGrupo?: number }
export type Ajustes = {
  nombreTienda: string; telefono: string; direccion: string; moneda: string
  validezDias: number; garantia: string; notaProforma: string; estilos: string[]
  inventarioCargado?: boolean
}

export const AJUSTES_INICIALES: Ajustes = {
  nombreTienda: cliente.nombreApp,
  telefono: '',
  direccion: cliente.ciudad ?? '',
  moneda: cliente.venta.moneda,
  validezDias: cliente.venta.validezDias,
  garantia: cliente.venta.garantia,
  notaProforma: '',
  estilos: cliente.estilos,
}

export const ESTADOS: Record<Estado, [string, string]> = {
  exhibicion: ['En exhibición', 'p-verde'],
  bodega: ['En bodega', 'p-gris'],
  apartado: ['Apartado', 'p-amarillo'],
  vendido: ['Vendido', 'p-rosa'],
}

// ---------- Lecturas en vivo ----------
export function useLista<T>(q: Query<DocumentData> | null, deps: unknown[] = []) {
  const [lista, setLista] = useState<T[] | null>(null)
  useEffect(() => {
    if (!q) { setLista([]); return }
    return onSnapshot(q, (s) => setLista(s.docs.map((d) => ({ id: d.id, ...d.data() }) as T)), (e) => {
      console.error(e); setLista([])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return lista
}

export function useDoc<T>(ruta: string | null) {
  const [dato, setDato] = useState<T | null | undefined>(undefined)
  useEffect(() => {
    if (!ruta) { setDato(null); return }
    return onSnapshot(doc(db, ruta), (s) => setDato(s.exists() ? ({ id: s.id, ...s.data() } as T) : null), () => setDato(null))
  }, [ruta])
  return dato
}

export function useAjustesConEstado(): [Ajustes, boolean] {
  const [estado, setEstado] = useState<[Ajustes, boolean]>([AJUSTES_INICIALES, false])
  useEffect(() => onSnapshot(doc(db, 'ajustes', 'general'), (s) => {
    setEstado([s.exists() ? { ...AJUSTES_INICIALES, ...s.data() } : AJUSTES_INICIALES, true])
  }, () => setEstado([AJUSTES_INICIALES, true])), [])
  return estado
}
export const useAjustes = () => useAjustesConEstado()[0]

export const col = (nombre: string) => collection(db, nombre)
export const todos = (nombre: string) => query(col(nombre))

// ---------- Textos y números ----------
export const dinero = (n: number, moneda: string) => `${moneda} ${Math.round(n).toLocaleString('es-NI')}`
export const nombreProducto = (p: { marca: string; modelo: string }) => [p.marca, p.modelo].filter(Boolean).join(' ')
export const totalProforma = (p: Pick<Proforma, 'items' | 'descuento'>) =>
  Math.max(0, p.items.reduce((s, i) => s + i.precio * i.cantidad, 0) - (p.descuento || 0))

export function codigoAzar(largo = 6, letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') {
  return Array.from(crypto.getRandomValues(new Uint32Array(largo)), (n) => letras[n % letras.length]).join('')
}
// Código largo para enlaces públicos: imposible de adivinar.
export const codigoEnlace = () => codigoAzar(20, 'abcdefghijkmnpqrstuvwxyz23456789')
export function numeroProforma() {
  const d = new Date()
  return `P-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${codigoAzar(3, '0123456789')}`
}

export const fechaCorta = (d: Date) => d.toLocaleDateString('es-NI', { day: 'numeric', month: 'short' })
export const sumarDias = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

// ---------- WhatsApp ----------
export function enlaceWhatsApp(telefono: string | undefined, texto: string) {
  let n = (telefono ?? '').replace(/\D/g, '')
  if (n.length === 8) n = `505${n}` // número de Nicaragua sin código de país
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

export function mensajeError(e: unknown) {
  const codigo = (e as { code?: string })?.code ?? ''
  if (codigo.includes('permission-denied')) return 'No tienes permiso para hacer eso.'
  if (codigo.includes('unavailable')) return 'Sin conexión. Se guardará cuando vuelva la señal.'
  if (codigo.includes('popup-closed')) return 'Se cerró la ventana de Google antes de terminar.'
  if (codigo.includes('resource-exhausted') || codigo.includes('invalid-argument')) return 'La foto es demasiado grande. Prueba con otra.'
  if (codigo.includes('operation-not-allowed') || codigo.includes('configuration-not-found')) return 'Falta activar "Google" en Authentication del Firebase de esta app.'
  if (codigo.includes('missing-initial-state') || codigo.includes('web-storage-unsupported')) return 'Este navegador no deja entrar con Google. Abre el enlace en Safari o Chrome.'
  if (codigo.includes('unauthorized-domain')) return 'Este enlace no está autorizado en Authentication → Dominios autorizados.'
  return `Algo salió mal. Intenta de nuevo.${codigo ? ` (${codigo})` : ''}`
}

export const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
