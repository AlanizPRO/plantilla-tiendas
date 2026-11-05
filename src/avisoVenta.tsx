import { enlaceWhatsApp, type Ajustes } from './datos'
import { ICONOS } from './iconos'

// Aviso de venta al dueño por WhatsApp (gratis, sin servidor).
// Cuando un vendedor registra una venta, le sale este botón con el mensaje ya escrito;
// solo tiene que tocar Enviar en WhatsApp. El número sale de Ajustes (o del teléfono de la tienda).
export function numeroAvisos(a: Ajustes) {
  return (a.whatsappAvisos || a.telefono || '').trim()
}

export function AvisarDueno({ ajustes, texto, onListo }: { ajustes: Ajustes; texto: string; onListo: () => void }) {
  const numero = numeroAvisos(ajustes)
  if (!numero) return null
  return (
    <div className="panel">
      <p><b>Venta registrada.</b> Avísale al dueño:</p>
      <a className="btn btn-whatsapp" href={enlaceWhatsApp(numero, texto)} target="_blank" rel="noreferrer" onClick={onListo}>{ICONOS.whatsapp}Avisar al dueño por WhatsApp</a>
    </div>
  )
}
