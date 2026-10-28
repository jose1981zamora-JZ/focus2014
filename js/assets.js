/* Lista de recursos que se guardan para funcionar sin conexión.
   La usan el Service Worker (sw.js) y la página (indicador "Listo sin conexión").
   Si agrega un archivo a la app, agréguelo aquí y suba APP_VERSION. */
var APP_VERSION = "1.0.0";
var CACHE_NAME = "focus2014-v" + APP_VERSION;
var F14_ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/assets.js",
  "js/store.js",
  "js/diagram.js",
  "js/app.js",
  "data/fuses.json",
  "data/boxes.json",
  "data/diagnostics.json",
  "data/synonyms.json",
  "data/content.json",
  "data/sources.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon-180.png"
];
