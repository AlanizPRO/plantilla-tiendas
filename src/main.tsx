import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos.css'
import App from './App'
import SeleccionPublica from './publico/SeleccionPublica'
import ProformaPublica from './publico/ProformaPublica'
import CatalogoPublico from './publico/CatalogoPublico'
import { cliente } from './cliente'
import { guardarInvitacionDeLaUrl } from './sesion'

// Colores de esta tienda (desde src/cliente.json).
const raiz = document.documentElement.style
raiz.setProperty('--principal', cliente.colorPrincipal)
raiz.setProperty('--acento', cliente.colorAcento)
raiz.setProperty('--fondo', cliente.colorFondo)
// Color de las letras sobre el color principal y el de acento: el que eligió el dueño, o blanco/negro según el fondo.
const hexAClaro = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const letrasPara = (fondo: string, elegido?: string) =>
  /^#[0-9a-f]{6}$/i.test(elegido ?? '') ? elegido! : hexAClaro(fondo) > 0.6 ? '#1b2526' : '#ffffff'
const elegidos = (cliente as { colorLetras?: string[] }).colorLetras ?? []
raiz.setProperty('--sobre-principal', letrasPara(cliente.colorPrincipal, elegidos[0]))
raiz.setProperty('--sobre-acento', letrasPara(cliente.colorAcento, elegidos[1]))

// Enlaces para clientes (sin entrar con Google): /s/CODIGO (selección) y /p/CODIGO (proforma).
const [, tipo, codigo] = location.pathname.split('/')
const pagina = tipo === 's' && codigo ? <SeleccionPublica codigo={codigo} />
  : tipo === 'p' && codigo ? <ProformaPublica codigo={codigo} />
  : tipo === 'catalogo' ? <CatalogoPublico />
  : <App />
if (pagina.type === App) guardarInvitacionDeLaUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pagina}
  </StrictMode>,
)
