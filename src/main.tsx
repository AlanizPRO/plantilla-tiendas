import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos.css'
import App from './App'
import SeleccionPublica from './publico/SeleccionPublica'
import ProformaPublica from './publico/ProformaPublica'
import { cliente } from './cliente'
import { guardarInvitacionDeLaUrl } from './sesion'

// Colores de esta tienda (desde src/cliente.json).
const raiz = document.documentElement.style
raiz.setProperty('--principal', cliente.colorPrincipal)
raiz.setProperty('--acento', cliente.colorAcento)
raiz.setProperty('--fondo', cliente.colorFondo)

// Enlaces para clientes (sin entrar con Google): /s/CODIGO (selección) y /p/CODIGO (proforma).
const [, tipo, codigo] = location.pathname.split('/')
const pagina = tipo === 's' && codigo ? <SeleccionPublica codigo={codigo} />
  : tipo === 'p' && codigo ? <ProformaPublica codigo={codigo} />
  : <App />
if (pagina.type === App) guardarInvitacionDeLaUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pagina}
  </StrictMode>,
)
