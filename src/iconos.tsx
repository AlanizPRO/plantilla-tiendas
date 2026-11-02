import type { ReactNode } from 'react'

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const ICONOS: Record<string, ReactNode> = {
  inicio: <svg {...base}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>,
  vitrinas: <svg {...base}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 12h18M12 4v16" /></svg>,
  inventario: <svg {...base}><circle cx="12" cy="12" r="6" /><path d="M12 9v3l2 1.5" /><path d="M9 6.5 9.8 3h4.4l.8 3.5M9 17.5l.8 3.5h4.4l.8-3.5" /></svg>,
  ventas: <svg {...base}><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></svg>,
  equipo: <svg {...base}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.7c1.8.8 3 2.6 3.5 5.3" /></svg>,
  mas: <svg {...base}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>,
  ajustes: <svg {...base}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>,
  whatsapp: <svg {...base}><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" /><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1 1.8.8c-.2 1-1 1.7-2 1.7C11 15.5 8.5 13 8.5 10.2c0-1 .7-1.8 1.7-2l.8 1.8z" /></svg>,
  sol: <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  luna: <svg {...base}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>,
  enlace: <svg {...base}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>,
  corazon: <svg {...base}><path d="M12 20s-7.5-4.6-9-9.2C2 7.6 4.1 5 7 5c2 0 3.3 1.1 5 3 1.7-1.9 3-3 5-3 2.9 0 5 2.6 4 5.8-1.5 4.6-9 9.2-9 9.2z" /></svg>,
  camara: <svg {...base}><path d="M4 7h3l2-2.5h6L17 7h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  imprimir: <svg {...base}><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></svg>,
}
