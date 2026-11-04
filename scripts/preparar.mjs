// Prepara la app con los datos de src/cliente.json antes de compilar o publicar:
// - revisa que la configuración esté completa
// - escribe firestore.rules con los correos de los dueños
import { readFileSync, writeFileSync } from 'node:fs'

const cliente = JSON.parse(readFileSync(new URL('../src/cliente.json', import.meta.url), 'utf8'))
const correoValido = (c) => /^[^@\s'"\\]+@[^@\s'"\\]+\.[a-z]{2,}$/.test(c)
const principal = String(cliente.correoAdmin ?? '').trim().toLowerCase()
const extras = (Array.isArray(cliente.correosAdmin) ? cliente.correosAdmin : [])
  .map((c) => String(c).trim().toLowerCase())
  .filter(Boolean)
const correos = [...new Set([principal, ...extras])]
const problemas = []
if (!correoValido(principal)) problemas.push('correoAdmin no es un correo válido')
if (extras.some((c) => !correoValido(c))) problemas.push('hay un correo de dueño extra que no es válido (correosAdmin)')
if (!cliente.nombreApp) problemas.push('falta nombreApp')
if (!cliente.firebase?.projectId) problemas.push('falta firebase.projectId')
if (problemas.length) {
  console.error(`src/cliente.json: ${problemas.join('; ')}`)
  process.exit(1)
}
const lista = correos.map((c) => `'${c}'`).join(', ')
const reglas = readFileSync(new URL('../firestore.plantilla.rules', import.meta.url), 'utf8').replaceAll('__CORREOS_ADMIN__', lista)
writeFileSync(new URL('../firestore.rules', import.meta.url), reglas)
console.log(`Listo: ${cliente.nombreApp} (${cliente.firebase.projectId}), administradores ${correos.join(', ')}`)
