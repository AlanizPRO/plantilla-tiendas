# Plantilla de tiendas

App para tiendas con inventario por ubicación (relojerías, ópticas, joyerías, boutiques). El dueño maneja productos con foto, vitrinas con segmentos y vendedores; cada vendedor arma selecciones para un cliente, se las manda por WhatsApp y hace la proforma con lo que el cliente eligió.

**No se edita a mano.** La Super App crea un repositorio por cliente desde esta plantilla y le escribe `src/cliente.json` (nombre, colores, dueño, palabras del negocio, módulos, moneda, estilos y datos públicos de Firebase).

## Cómo se usa

1. **Vitrinas:** el dueño crea sus vitrinas con segmentos (A, B…). Cada segmento muestra cuántos productos tiene; con "Contar" se marcan los que se ven y la app dice cuáles faltan.
1. **Mover varios a la vez:** en un segmento o en Productos se toca "Mover varios", se eligen los que van (o "Todos") y se toca "Mover" para escoger la vitrina, segmento o bodega. Cada uno queda en los movimientos, igual que al moverlo solo.
2. **Productos:** marca, modelo, precio, estilo, hasta 6 fotos y dónde está (vitrina y segmento, bodega, apartado o vendido). El costo solo lo ve el dueño.
3. **Selección para un cliente:** el vendedor elige hasta 12 productos y manda el enlace `/s/…` por WhatsApp. El cliente lo abre sin cuenta, marca "Me gusta" y deja una nota. Al vendedor le aparece "Ya eligió".
4. **Proforma:** sale de la selección (o desde cero), con descuento, validez y garantía. Se comparte el enlace `/p/…`, que el cliente puede imprimir o guardar en PDF. "Se vendió" pasa los productos a Vendido.

## Palabras de cada negocio

`cliente.json → textos` cambia "reloj / vitrina" por lo que corresponda ("lente / estante", "joya / mostrador"). Módulos que se pueden quitar: `ubicaciones`, `selecciones`, `proformas`.

## Funciona en Firebase Spark (gratis)

- Sin Cloud Functions ni Storage. Las fotos se achican en el teléfono y se guardan en Firestore (grande ≤150 KB aparte, miniatura ≤14 KB en el producto).
- Los enlaces para clientes usan códigos largos al azar: se pueden abrir pero no listar. Las selecciones vencen (1 a 30 días).
- Los permisos viven en `firestore.plantilla.rules`; `scripts/preparar.mjs` pone el correo del dueño y escribe `firestore.rules` al compilar.

## Lo que necesita el proyecto de Firebase del cliente

1. Authentication → Google habilitado.
2. Firestore creado (modo producción).
3. Una app web registrada (sus datos van en `cliente.json → firebase`).
4. La cuenta `publicador` de Carlos agregada como Editor.

## Publicar

En el repositorio del cliente: secreto `FIREBASE_SERVICE_ACCOUNT` y variable `PUBLICAR_APP = si`. Cada cambio en `main` se publica y a los usuarios les sale el aviso de "versión nueva".

## Datos (Firestore)

| Colección | Qué guarda | Quién lee |
| --- | --- | --- |
| `productos` | ficha, precio, miniatura, lugar y estado | dueño y vendedores |
| `fotos/{id}` | foto grande | cualquiera con el id (no se listan) |
| `costos/{id}` | costo del producto | solo el dueño |
| `vitrinas` | nombre y segmentos | dueño y vendedores |
| `movimientos` | quién movió qué y adónde | dueño y vendedores |
| `selecciones/{código}` | productos para un cliente y lo que eligió | equipo; el cliente con el enlace mientras no venza |
| `proformas/{código}` | detalle, total, estado | equipo; el cliente con el enlace |
| `invitaciones/{código}`, `usuarios/{uid}` | vendedores | dueño; cada vendedor lo suyo |
| `ajustes/general` | nombre, teléfono, moneda, estilos, garantía | cualquiera (sale en los enlaces) |
