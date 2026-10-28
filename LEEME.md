# Ford Focus 2014 — Fusibles & Diagnóstico v1.0.0

PWA (aplicación web instalable) para consultar los fusibles y relevadores del Ford Focus 2014 y orientar el diagnóstico de fallas eléctricas. Está en español, funciona sin conexión una vez instalada y no usa cuentas, servidores propios ni servicios de pago.

## Contenido de la carpeta

| Ruta | Qué es |
|---|---|
| `index.html` | Página principal |
| `manifest.webmanifest` | Manifest para instalar en Android |
| `sw.js` | Service Worker (modo sin conexión) |
| `css/app.css` | Estilos (tema claro/oscuro) |
| `js/app.js` | Lógica: navegación, buscador, fichas, diagnóstico |
| `js/diagram.js` | Diagramas SVG originales con zoom y desplazamiento táctil |
| `js/store.js` | Favoritos, historial, marcas, notas (localStorage) y fotos propias (IndexedDB) |
| `js/assets.js` | Lista de archivos guardados offline y número de versión |
| `data/fuses.json` | **Base de datos técnica**: 144 posiciones (3 cajas) |
| `data/boxes.json` | Ubicación y acceso de cada caja |
| `data/diagnostics.json` | Flujos de diagnóstico (10 fallas) |
| `data/synonyms.json` | Sinónimos español/inglés para el buscador |
| `data/content.json` | Seguridad, guía básica, colores de fusibles, espacios de fotos |
| `data/sources.json` | Fuentes consultadas |
| `icons/` | Iconos originales |
| `tests/test_app.py` | Pruebas automatizadas (opcional, para desarrollo) |
| `INFORME_PRUEBAS.md` | Resultados de pruebas |

## 1. Publicar mediante HTTPS

Android solo instala una PWA y activa el modo sin conexión si la página se sirve por **HTTPS**. Abrir `index.html` como archivo (`file://`) **no** instala la app: además, el navegador bloquea la lectura de los datos y la app muestra un aviso.

### Opción A — GitHub Pages (gratis, solo navegador)
1. Cree una cuenta en github.com.
2. Cree un repositorio nuevo **público**, por ejemplo `focus2014`.
3. En el repositorio: **Add file → Upload files**. Arrastre **el contenido** de esta carpeta (que `index.html` quede en la raíz). Confirme con **Commit changes**.
4. **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main` / `(root)` → **Save**.
5. Espere 1–2 minutos. La dirección será `https://SU-USUARIO.github.io/focus2014/`.

### Opción B — Otro hosting estático con HTTPS
Netlify, Cloudflare Pages o cualquier servidor web con certificado HTTPS. Suba la carpeta completa tal cual. No requiere configuración especial.

## 2. Instalar en Android

1. En el teléfono, abra la dirección HTTPS en **Chrome**.
2. Espere a que la etiqueta superior diga **"✓ Offline listo"** (todos los recursos guardados).
3. Menú **⋮ → Instalar aplicación** (o *Agregar a pantalla principal*).
4. Abra la app desde el ícono. Pruebe en modo avión para confirmar.

## 3. Actualizar los datos técnicos

Los datos están separados de la interfaz: no hay que reprogramar nada.

1. Edite el archivo JSON correspondiente en `data/` (por ejemplo, corregir un amperaje en `fuses.json`). Respete el formato: cada registro tiene `id`, `caja`, `numero`, `amperaje`, `tipo`, `funcion_en`, `funcion_es`, `palabras`, `equipamiento`, `fuente`, `verificacion`, `observaciones`.
2. En `js/assets.js` suba la versión: `var APP_VERSION = "1.0.1";`
3. Vuelva a subir los archivos al hosting.
4. Abra la app con internet: descargará la nueva versión y avisará que cierre y vuelva a abrir.

Reglas: no rellene datos desconocidos (use `null`); si una fuente contradice a otra, ponga `"verificacion": "discrepancia"` y explique en `observaciones`.

Para agregar un archivo nuevo a la app, inclúyalo también en la lista `F14_ASSETS` de `js/assets.js`.

## 4. Fotografías

No se incluyen fotos: no se encontraron fotos del Focus 2014 con licencia que permita redistribuirlas. Cada caja tiene 5 espacios marcados **Pendiente**. Toque **Agregar mi foto** para usar la cámara: la foto se guarda solo en el teléfono. Para incluir fotos propias en la app para todos, agréguelas a `content.json → fotos.incluidas` (función prevista para la próxima versión).

## 5. Fuentes verificadas

| Fuente | Uso | Estado |
|---|---|---|
| Ford, *2014 Focus Owner's Guide* v.3 (3ª impresión, feb. 2014, EE. UU.) | Fuente principal: todas las tablas de fusibles, ubicación de cajas, colores, arranque remoto | Consultada. El PDF oficial no se pudo abrir desde el entorno de desarrollo; se leyó la misma edición en un espejo de texto (manualsdir.com), págs. impresas 63–65 y 223–232 |
| StartMyCar, *2014 Ford Focus fuse box diagram* | Contraste y tipo de fusible (Mini) en paneles del habitáculo y de cajuela | Consultada. No se copiaron imágenes ni diseño |
| Manual en español (manualzz) | Diferencias del mercado mexicano | **No accesible** desde el entorno de desarrollo |

## 6. Discrepancias detectadas (se conserva el dato del manual oficial)

| Posición | Manual oficial v.3 | StartMyCar |
|---|---|---|
| Motor F11 | 30A, No utilizado (repuesto) | Alimentación KL30 del BCM |
| Motor F24 | No utilizado, sin amperaje | 15A repuesto |
| Motor F29 | No utilizado, sin amperaje | 20A repuesto |
| Motor F30 | 5A, keep-alive **(Focus ST)** | sin la restricción ST |
| Motor F33 | 15A bobinas de encendido | 10A (normal) y 15A (ST) |
| Habitáculo F62, F63; Cajuela F1 | Repuestos | No los lista |

**F33:** si va a reemplazarlo, confirme el amperaje con la etiqueta de la tapa o un distribuidor.

## 7. Limitaciones conocidas

- **Disposición física no verificada.** Los diagramas son esquemas lógicos originales (orden numérico, agrupados por tipo). Los números, amperajes y funciones sí vienen del manual. Compare con la etiqueta impresa en la tapa de cada caja.
- **Mercado.** Los datos corresponden al manual de EE. UU. No se verificó si el Focus 2014 vendido en México tiene diferencias.
- **Arranque remoto.** Las tablas de Ford no documentan un fusible dedicado al arranque remoto. Si el sistema fue instalado después de la compra, sus fusibles están en su propio cableado.
- **Diagnóstico orientativo.** No sustituye un escáner ni a un técnico.
- **Fotos.** Pendientes (ver sección 4).

## 8. Elementos pendientes

1. Confirmar la disposición física de las tres cajas (foto de la etiqueta de cada tapa) para dibujar la posición real.
2. Revisar el manual mexicano en español para marcar diferencias de mercado.
3. Confirmar el amperaje de F33 en su vehículo.
4. Fotografías propias o con licencia.
5. Pruebas en un teléfono Android real (ver `INFORME_PRUEBAS.md`).
