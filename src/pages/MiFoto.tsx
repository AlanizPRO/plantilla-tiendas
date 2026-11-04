import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { useState } from 'react'
import { mensajeError } from '../datos'
import { db } from '../firebase'

// Reduce la foto a un cuadro de 160 px (recorte al centro) para guardarla en el perfil del colaborador.
export function reducirFoto(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onerror = () => rechazar(new Error('No se pudo leer la foto.'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => rechazar(new Error('Ese archivo no es una foto.'))
      img.onload = () => {
        const lado = Math.min(img.width, img.height)
        const canvas = document.createElement('canvas')
        canvas.width = 160; canvas.height = 160
        canvas.getContext('2d')?.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 160, 160)
        resolver(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = String(lector.result)
    }
    lector.readAsDataURL(archivo)
  })
}

// Foto del colaborador (o sus iniciales si todavía no tiene).
export function Avatar({ foto, texto }: { foto?: string; texto: string }) {
  return foto
    ? <img className="foto-perfil" src={foto} alt="" />
    : <span className="foto-perfil foto-perfil-letra">{texto}</span>
}

// Botón para que el colaborador ponga su foto en su cuenta personal.
export function CambiarFoto({ uid, foto }: { uid: string; foto?: string }) {
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function elegir(archivo?: File) {
    if (!archivo) return
    setError(''); setGuardando(true)
    try {
      const datos = await reducirFoto(archivo)
      await updateDoc(doc(db, 'usuarios', uid), { foto: datos })
    } catch (e) { setError(e instanceof Error && !('code' in e) ? e.message : mensajeError(e)) }
    finally { setGuardando(false) }
  }
  async function quitar() {
    try { await updateDoc(doc(db, 'usuarios', uid), { foto: deleteField() }) } catch (e) { setError(mensajeError(e)) }
  }
  return (
    <div className="panel">
      <h3>Mi foto</h3>
      <p className="suave chico">Así sabrán tus compañeros que esta cuenta es tuya.</p>
      <div className="fila">
        <Avatar foto={foto} texto="" />
        <label className="btn btn-principal" style={{ cursor: 'pointer' }}>
          {guardando ? 'Guardando…' : foto ? 'Cambiar foto' : 'Poner mi foto'}
          <input type="file" accept="image/*" hidden disabled={guardando} onChange={(e) => elegir(e.target.files?.[0])} />
        </label>
        {foto && <button className="btn btn-borde btn-chico" onClick={quitar}>Quitar</button>}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
