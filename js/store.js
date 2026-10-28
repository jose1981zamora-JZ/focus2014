/* Almacenamiento local: preferencias, favoritos, historial, marcas y notas (localStorage)
   y fotografías del usuario (IndexedDB). Nunca modifica los datos técnicos. */
(function(){
  var KEY = "focus2014:user:v1";
  var def = { theme: "auto", favs: [], hist: [], marks: {}, notes: {} };
  var mem = null;

  function load(){
    if (mem) return mem;
    try { mem = Object.assign({}, def, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch(e){ mem = JSON.parse(JSON.stringify(def)); }
    return mem;
  }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(mem)); return true; } catch(e){ return false; } }

  var Store = {
    get: function(){ return load(); },
    setTheme: function(t){ load().theme = t; save(); },
    isFav: function(id){ return load().favs.indexOf(id) >= 0; },
    toggleFav: function(id){
      var f = load().favs, i = f.indexOf(id);
      if (i >= 0) f.splice(i,1); else f.unshift(id);
      save(); return i < 0;
    },
    addHist: function(id){
      var h = load().hist.filter(function(x){ return x.id !== id; });
      h.unshift({ id: id, t: Date.now() });
      mem.hist = h.slice(0, 40); save();
    },
    clearHist: function(){ load().hist = []; save(); },
    getMark: function(id){ return load().marks[id] || null; },
    setMark: function(id, m){ var ms = load().marks; if (!m || ms[id] === m) delete ms[id]; else ms[id] = m; save(); return ms[id] || null; },
    getNote: function(id){ return load().notes[id] || ""; },
    setNote: function(id, txt){ var n = load().notes; if (txt && txt.trim()) n[id] = txt; else delete n[id]; save(); },
    resetAll: function(){ var th = load().theme; mem = JSON.parse(JSON.stringify(def)); mem.theme = th; save(); }
  };

  /* ---- Fotos del usuario (IndexedDB) ---- */
  var DBN = "focus2014-photos", ST = "photos";
  function db(){
    return new Promise(function(res, rej){
      if (!("indexedDB" in window)) return rej(new Error("IndexedDB no disponible"));
      var r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore(ST); };
      r.onsuccess = function(){ res(r.result); };
      r.onerror = function(){ rej(r.error); };
    });
  }
  function tx(mode, fn){
    return db().then(function(d){ return new Promise(function(res, rej){
      var t = d.transaction(ST, mode), s = t.objectStore(ST), out = fn(s);
      t.oncomplete = function(){ res(out && out.result !== undefined ? out.result : undefined); };
      t.onerror = function(){ rej(t.error); };
    }); });
  }
  Store.photos = {
    put: function(key, blob){ return tx("readwrite", function(s){ return s.put({ blob: blob, t: Date.now() }, key); }); },
    get: function(key){ return tx("readonly", function(s){ return s.get(key); }); },
    del: function(key){ return tx("readwrite", function(s){ return s.delete(key); }); },
    clear: function(){ return tx("readwrite", function(s){ return s.clear(); }); }
  };

  window.Store = Store;
})();
