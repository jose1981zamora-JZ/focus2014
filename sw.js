/* Service Worker — Focus 2014 Fusibles & Diagnóstico
   Guarda todos los recursos de F14_ASSETS para uso sin conexión.
   Estrategia: responde desde la caché y actualiza en segundo plano (stale-while-revalidate). */
importScripts("js/assets.js");

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(c){ return c.addAll(F14_ASSETS); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k.indexOf("focus2014-") === 0 && k !== CACHE_NAME; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // enlaces externos: sin intervenir

  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.match(req, { ignoreSearch: true }).then(function(hit){
        var net = fetch(req).then(function(res){
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        }).catch(function(){ return null; });
        if (hit){ e.waitUntil(net); return hit; }
        return net.then(function(res){
          if (res) return res;
          if (req.mode === "navigate") return cache.match("index.html");
          return new Response("Recurso no disponible sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        });
      });
    })
  );
});
