import { useEffect, useRef, useState } from 'react'

// Cámara del teléfono con encuadre cuadrado (1:1): lo que se ve dentro del cuadro es lo que se guarda.
export default function Camara({ onFoto, onCerrar }: { onFoto: (archivo: File) => void; onCerrar: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  useEffect(() => {
    let flujo: MediaStream | null = null
    let vivo = true
    if (!navigator.mediaDevices?.getUserMedia) { setError('Este navegador no deja abrir la cámara aquí. Usa "Elegir de la galería".'); return }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (!vivo) { s.getTracks().forEach((t) => t.stop()); return }
        flujo = s
        if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}) }
        setListo(true)
      })
      .catch(() => setError('No pude abrir la cámara. Revisa que la app tenga permiso de cámara, o usa "Elegir de la galería".'))
    return () => { vivo = false; flujo?.getTracks().forEach((t) => t.stop()) }
  }, [])

  function disparar() {
    const v = video.current
    if (!v || !v.videoWidth) return
    const lado = Math.min(v.videoWidth, v.videoHeight)
    const x = (v.videoWidth - lado) / 2
    const y = (v.videoHeight - lado) / 2
    const c = document.createElement('canvas')
    c.width = c.height = Math.min(1080, lado)
    c.getContext('2d')!.drawImage(v, x, y, lado, lado, 0, 0, c.width, c.height)
    c.toBlob((b) => {
      if (!b) { setError('No pude tomar la foto. Intenta de nuevo.'); return }
      onFoto(new File([b], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      onCerrar()
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="camara-fondo" role="dialog" aria-label="Tomar foto">
      <div className="camara-caja">
        {error ? <p className="error">{error}</p> : (
          <div className="camara-marco">
            <video ref={video} playsInline muted autoPlay />
            <div className="camara-cuadro" aria-hidden="true" />
          </div>
        )}
        <div className="fila" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-borde" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-principal" disabled={!listo} onClick={disparar}>Tomar foto</button>
        </div>
      </div>
    </div>
  )
}
