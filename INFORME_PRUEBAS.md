# Informe de pruebas — Focus 2014 Fusibles & Diagnóstico v1.0.0

Fecha: 28 de octubre de 2026

## Resumen

| Tipo | Estado |
|---|---|
| Pruebas automatizadas (Chromium sin interfaz, emulación Pixel 7, servidor local) | **71 aprobadas, 0 fallidas de 71** |
| Revisión de código y de datos contra el manual | Completada |
| Pruebas en teléfono Android físico | **Pendiente**: no se ejecutaron |
| Instalación real como PWA en Android | **Pendiente**: no se ejecutó |
| Gesto de pellizco (dos dedos) para zoom | **Pendiente en dispositivo real**: el código existe, pero la prueba automatizada cubrió zoom con botones, rueda y arrastre |

## Cómo se ejecutaron

`python3 tests/test_app.py` levanta un servidor en `http://localhost:8765` (contexto seguro, igual que HTTPS para el Service Worker) y controla Chromium con Playwright simulando un Pixel 7 con pantalla táctil.

## Cobertura por requisito

| # | Requisito | Cómo se probó |
|---|---|---|
| 1 | Navegación entre pantallas | Todas las rutas, botón regresar |
| 2 | Búsqueda por número y función | F13, R10, 20A, claxon, horn, fuel pump, bomba de gasolina, etc. |
| 3 | Selección táctil | Toque simulado en **las 144 celdas** de las 3 cajas |
| 4 | Correspondencia diagrama ↔ ficha | Cada toque abre la ficha del mismo ID |
| 5 | Zoom y desplazamiento | Botones +/−, vista completa, rueda, arrastre, "localizar" |
| 6 | Diagnóstico guiado | 10 flujos completos; caso especial de encendido remoto |
| 7 | Persistencia de favoritos | Tras recargar la página |
| 8 | Persistencia de notas e historial | Tras recargar; notas no alteran los datos técnicos |
| 9 | Tema claro/oscuro | Cambio y persistencia |
| 10 | Diseño en pantallas Android | 360, 393, 412 y 800 px sin desbordamiento; objetivos táctiles ≥ 44 px |
| 11 | Manifest | Campos e iconos accesibles |
| 12 | Caché y offline | Indicador "Offline listo" y navegación completa en modo sin conexión |
| 13 | Recursos faltantes | Fotos pendientes, JSON faltante, apertura por file:// |
| 14 | Datos vs. fuentes | 21 valores de control del manual, 28 posiciones sin uso, 11 relevadores, referencias internas del diagnóstico |

## Errores encontrados y corregidos durante las pruebas

1. El visor de fotos oculto bloqueaba los toques (un estilo anulaba el atributo `hidden`).
2. El botón de zoom tapaba el relevador R6 de la cajuela: los controles se movieron debajo del diagrama.
3. Títulos largos desbordaban 2 px en pantallas de 360 px.
4. Al abrir con `file://` el indicador decía "Preparando" en lugar de "Sin modo offline".
5. El texto del diagrama heredaba el contorno de los iconos y se veía borroso.
6. En vista completa los fusibles eran pequeños: el diagrama ahora ocupa todo el ancho.

## Resultados detallados

| | Prueba |
|---|---|
| ✅ | 14a Datos: IDs únicos — 144 registros |
| ✅ | 14b Datos: amperajes y funciones de control coinciden con el manual |
| ✅ | 14c Datos: posiciones sin uso marcadas |
| ✅ | 14d Datos: relevadores correctos |
| ✅ | 14e Datos: todo registro tiene fuente y página |
| ✅ | 14f Datos: todo fusible activo tiene amperaje |
| ✅ | 14g Diagnóstico: referencias a fusibles/preguntas/hipótesis válidas |
| ✅ | 14h Encendido remoto: no recomienda F13/R10 como causa (solo en 'no confundir') |
| ✅ | 1a Inicio: seis accesos |
| ✅ | 1b Navegación #/cajas — Diagramas |
| ✅ | 1b Navegación #/buscar — Buscar fusible |
| ✅ | 1b Navegación #/diag — Diagnóstico |
| ✅ | 1b Navegación #/fotos — Fotografías y ubicaciones |
| ✅ | 1b Navegación #/favoritos — Mis fusibles |
| ✅ | 1b Navegación #/seguridad — Guía de seguridad |
| ✅ | 1b Navegación #/fuentes — Fuentes y versión |
| ✅ | 1c Botón regresar |
| ✅ | 2a Buscar 'F13' → M-F13 primero — F13 |
| ✅ | 2b Buscar 'R10' relevador de arranque |
| ✅ | 2c Buscar 'claxon' → F20/R2 |
| ✅ | 2d Buscar en inglés 'horn' |
| ✅ | 2e 'bomba de gasolina' → F56 — F56 |
| ✅ | 2f 'fuel pump' → F56 |
| ✅ | 2g Amperaje '20A' solo 20A — 11 resultados |
| ✅ | 2h 'limpiaparabrisas' → F18 |
| ✅ | 2i 'seguros' → F70 |
| ✅ | 2j 'aire acondicionado' → F27 |
| ✅ | 2k 'ventanas' → F46/F14 |
| ✅ | 2l 'radio' → F79 |
| ✅ | 2m 'encendido remoto' muestra guía y aviso |
| ✅ | 2n Búsqueda sin resultados |
| ✅ | 2o Resultado abre ficha |
| ✅ | 2p 'Ver en diagrama' selecciona F20 |
| ✅ | 3/4 Toque en cada celda abre su ficha correcta — 144 celdas probadas; errores: [] |
| ✅ | 5a Zoom + (botón) — escala 1.96 |
| ✅ | 5b Desplazamiento por arrastre — Δtx=-113.5 |
| ✅ | 5c Vista completa |
| ✅ | 5d Zoom con rueda |
| ✅ | 5e Localizar centra y amplía |
| ✅ | 6a Diagnóstico llega a resultado |
| ✅ | 6b Resultado separa documentadas/hipótesis |
| ✅ | 6c Interpreta pitido + destello con el manual |
| ✅ | 6d 'No confundir' F13/R10 y prohibición de puentear |
| ✅ | 6e Indica cuándo acudir a técnico |
| ✅ | 6f Cambiar última respuesta regresa a pregunta |
| ✅ | 6g 'No arranca' (no gira) lista F13 y R10 |
| ✅ | 6h Flujo 'radio' termina — 4 preguntas |
| ✅ | 6h Flujo 'seguros' termina — 3 preguntas |
| ✅ | 6h Flujo 'limpiadores' termina — 4 preguntas |
| ✅ | 6h Flujo 'clima' termina — 3 preguntas |
| ✅ | 6h Flujo 'luces' termina — 5 preguntas |
| ✅ | 6h Flujo 'ventanas' termina — 1 preguntas |
| ✅ | 6h Flujo 'claxon' termina — 2 preguntas |
| ✅ | 6h Flujo 'accesorios' termina — 7 preguntas |
| ✅ | 7 Persistencia de favoritos tras recargar |
| ✅ | 8a Persistencia del historial |
| ✅ | 8b Persistencia de marca y nota |
| ✅ | 8c Marca visible en diagrama |
| ✅ | 8d Datos técnicos no modificados por notas |
| ✅ | 9 Cambio claro/oscuro y persistencia — light→dark, tras recargar dark |
| ✅ | 10 Sin desbordamiento horizontal en 360–800 px |
| ✅ | 10b Objetivos táctiles ≥ 44 px — 0 elementos pequeños |
| ✅ | 11a Manifest válido (nombre, start_url, display, iconos 192/512/maskable) |
| ✅ | 11b Iconos del manifest accesibles |
| ✅ | 12a Indicador 'Offline listo' (todos los recursos en caché) — ✓ Offline listo |
| ✅ | 12b Sin conexión: inicio, diagrama, búsqueda y diagnóstico funcionan |
| ✅ | Consola sin errores JS |
| ✅ | 13a Fotos faltantes muestran 'Pendiente' sin romper la app |
| ✅ | 13b Foto del usuario se guarda y persiste (IndexedDB) |
| ✅ | 13c Datos faltantes: mensaje claro de error |
| ✅ | 13d Abierto con file:// avisa que requiere HTTPS |

## Pruebas pendientes en su teléfono

1. Instalar desde Chrome (menú ⋮ → Instalar aplicación) y abrir desde el ícono.
2. Activar modo avión y recorrer diagramas, búsqueda y diagnóstico.
3. Zoom con dos dedos en el diagrama.
4. Tomar una foto con "Agregar mi foto".
5. Comparar cada caja con la etiqueta de su tapa (disposición física).
