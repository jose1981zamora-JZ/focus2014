/* Focus 2014 — Fusibles & Diagnóstico · lógica principal (sin dependencias) */
(function(){
  "use strict";
  var D = { fuses:null, boxes:null, diag:null, syn:null, content:null, sources:null, byId:{} };
  var $view = document.getElementById("view");
  var $title = document.getElementById("viewTitle");
  var $back = document.getElementById("btnBack");
  var currentDiagram = null;
  var diagState = null;

  /* ---------------- utilidades ---------------- */
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function norm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9./ ]+/g," ").replace(/\s+/g," ").trim(); }
  function icon(name){
    var P = {
      grid:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8v8M11 8v8M15 8v8M19 8v8"/>',
      search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
      pulse:'<path d="M3 12h4l2-5 4 10 2-5h6"/>',
      camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
      heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
      shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 8v5M12 16v.5"/>',
      remote:'<rect x="7" y="2" width="10" height="20" rx="4"/><path d="M10 7h4M12 12a2 2 0 1 0 0.01 0"/>',
      engine:'<path d="M4 10h3l2-3h6v3h3l2 2v5h-2v2h-4l-2-2H7v-3H4z"/>',
      radio:'<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="15" cy="13" r="3"/><path d="M6 11h4M6 15h4M7 7l9-4"/>',
      lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
      wiper:'<path d="M12 20L5 7"/><path d="M3 20a14 14 0 0 1 18 0"/>',
      ac:'<path d="M12 2v20M4 6l16 12M20 6L4 18"/>',
      light:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
      window:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 12h16"/>',
      horn:'<path d="M3 10v4h4l6 4V6L7 10z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
      plug:'<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
      info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
      warn:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
      chev:'<path d="M9 5l7 7-7 7"/>',
      star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
      target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
      expand:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
      book:'<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-5a3 3 0 0 0-3 3"/>',
      check:'<path d="M5 12l5 5 9-10"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || P.info) + '</svg>';
  }
  function toast(msg){
    var t = document.getElementById("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function(){ t.hidden = true; }, 2200);
  }
  function boxById(id){ return D.boxes.cajas.filter(function(b){ return b.id === id; })[0]; }
  function srcLabel(f){
    if (!f) return "";
    var s = D.sources.fuentes.filter(function(x){ return x.id === f.id; })[0];
    return (s ? (s.id === "OM2014v3" ? "Manual del propietario Ford 2014 v.3" : s.titulo) : f.id) + (f.pagina ? ", pág. " + f.pagina : "");
  }
  function ampChip(r){
    if (!r.amperaje) return "";
    var c = Diagram.colorFor(r);
    return '<span class="amp"><i style="background:'+c+'"></i>'+esc(r.amperaje)+'</span>';
  }
  function stateBadge(r){
    if (r.estado === "sin-uso") return '<span class="badge b-gray">Sin uso</span>';
    if (r.estado === "repuesto") return '<span class="badge b-gray">Repuesto</span>';
    if (r.verificacion === "discrepancia") return '<span class="badge b-pend">Discrepancia entre fuentes</span>';
    return '<span class="badge b-ok">Verificado en manual</span>';
  }
  function markLabel(m){ return { revisado:"Revisado", correcto:"Correcto", danado:"Dañado", pendiente:"Pendiente" }[m] || ""; }
  function markBadge(m){ var c = { revisado:"b-info", correcto:"b-ok", danado:"b-warn", pendiente:"b-pend" }[m]; return m ? '<span class="badge '+c+'">'+markLabel(m)+'</span>' : ""; }

  function fuseRow(r, extra){
    return '<button class="row" data-open="'+r.id+'">' +
      '<span class="num'+(r.clase==="relevador"?" relay":"")+'">'+esc(r.numero)+'</span>' +
      '<span class="grow"><span class="t">'+esc(r.funcion_es)+'</span>' +
      '<span class="s">'+esc(boxById(r.caja).nombre)+' · '+(r.amperaje ? esc(r.amperaje) : (r.tipo ? esc(r.tipo) : "—"))+(extra ? " · " + extra : "")+'</span></span>' +
      (r.amperaje ? ampChip(r) : "") + icon("chev").replace('<svg','<svg class="chev"') + '</button>';
  }

  /* ---------------- carga de datos ---------------- */
  function loadJSON(p){ return fetch(p, { cache:"no-cache" }).then(function(r){ if(!r.ok) throw new Error(p+" → HTTP "+r.status); return r.json(); }); }
  function loadAll(){
    return Promise.all(["data/fuses.json","data/boxes.json","data/diagnostics.json","data/synonyms.json","data/content.json","data/sources.json"].map(loadJSON))
      .then(function(a){
        D.fuses = a[0]; D.boxes = a[1]; D.diag = a[2]; D.syn = a[3]; D.content = a[4]; D.sources = a[5];
        D.fuses.registros.forEach(function(r){ D.byId[r.id] = r; });
        buildIndex();
      });
  }

  /* ---------------- tema ---------------- */
  function applyTheme(){
    var t = Store.get().theme, dark;
    if (t === "auto") dark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
    else dark = t === "dark";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.querySelector('meta[name="theme-color"]').setAttribute("content", "#0b1a2e");
  }
  document.getElementById("btnTheme").addEventListener("click", function(){
    var cur = document.documentElement.getAttribute("data-theme");
    Store.setTheme(cur === "dark" ? "light" : "dark"); applyTheme();
    toast(cur === "dark" ? "Tema claro" : "Tema oscuro");
  });

  /* ---------------- búsqueda ---------------- */
  var INDEX = [];
  function buildIndex(){
    INDEX = D.fuses.registros.map(function(r){
      var b = boxById(r.caja);
      return { r:r, txt: norm([r.funcion_es, r.funcion_en, (r.palabras||[]).join(" "), b.nombre, r.equipamiento||"", r.tipo||""].join(" ")) };
    });
  }
  function expand(q){
    var nq = norm(q), terms = [nq];
    D.syn.grupos.forEach(function(g){
      var ng = g.map(norm);
      if (ng.some(function(t){ return t.length > 1 && ((" " + nq + " ").indexOf(" " + t + " ") >= 0 || (t.indexOf(nq) === 0 && nq.length >= 3)); }))
        ng.forEach(function(t){ if (terms.indexOf(t) < 0) terms.push(t); });
    });
    return terms;
  }
  function search(q){
    var nq = norm(q); if (!nq) return { fuses:[], faults:[] };
    var res = [];
    var mNum = nq.match(/^([fr])\s?(\d{1,2})$/);
    var mBare = nq.match(/^(\d{1,2}(?:\.5)?)\s?(a|amp|amps|amperes)?$/);
    var terms = expand(q);
    INDEX.forEach(function(it){
      var r = it.r, score = 0, num = norm(r.numero);
      if (mNum && num === (mNum[1] + mNum[2])) score += 100;
      if (mBare){
        if (!mBare[2] && num.replace(/^[fr]/,"") === mBare[1]) score += 60;
        if (r.amperaje && norm(r.amperaje) === mBare[1] + "a") score += mBare[2] ? 90 : 50;
      }
      if (!mNum){
        terms.forEach(function(t, i){
          if (t.length < 2) return;
          if (it.txt.indexOf(t) >= 0) score += (i === 0 ? 30 : 15) + (new RegExp("(^| )" + t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(it.txt) ? 5 : 0);
        });
        nq.split(" ").forEach(function(w){ if (w.length > 2 && it.txt.indexOf(w) >= 0) score += 4; });
      }
      if (score > 0 && r.estado === "sin-uso" && !(mNum && score >= 100) && !(mBare && !mBare[2])) score = 0;
      if (r.estado === "sin-uso") score -= 20;
      if (score > 0) res.push({ r:r, score:score });
    });
    res.sort(function(a,b){ return b.score - a.score || a.r.caja.localeCompare(b.r.caja) || a.r.orden - b.r.orden; });
    var faults = D.diag.fallas.filter(function(f){
      var t = norm(f.titulo + " " + f.intro);
      return terms.some(function(x){ return x.length > 2 && t.indexOf(x) >= 0; });
    });
    return { fuses: res.map(function(x){ return x.r; }), faults: faults };
  }

  /* ---------------- ficha (bottom sheet) ---------------- */
  var $sheet = document.getElementById("sheet"), $bd = document.getElementById("sheetBackdrop");
  function relatedFaults(id){
    return D.diag.fallas.filter(function(f){
      return (f.fusibles||[]).concat(f.noConfundir||[]).some(function(x){ return x.id === id; });
    });
  }
  function openSheet(id, opts){
    var r = D.byId[id]; if (!r) return;
    opts = opts || {};
    Store.addHist(id);
    var b = boxById(r.caja), color = Diagram.colorFor(r), fav = Store.isFav(id), mark = Store.getMark(id);
    var numStyle = color ? 'background:'+color+';color:'+(Diagram.isDark(color)?"#fff":"#111") : (r.clase==="relevador" && r.estado!=="sin-uso" ? 'background:#2b3442;color:#fff' : 'background:var(--surface2)');
    var rel = relatedFaults(id);
    var h = '<div class="grabber"></div>' +
      '<div class="sheet-head"><div class="bignum" style="'+numStyle+'">'+esc(r.numero)+'</div>' +
      '<div><h2 id="sheetTitle">'+(r.clase === "relevador" ? "Relevador " : "Fusible ")+esc(r.numero)+'</h2>' +
      '<div class="small muted">'+esc(b.nombre)+'</div><div style="margin-top:6px">'+stateBadge(r)+' '+markBadge(mark)+'</div></div></div>' +
      '<div class="fn">'+esc(r.funcion_es)+'</div><div class="fn-en">Manual (inglés): “'+esc(r.funcion_en)+'”</div>' +
      '<dl class="kv">' +
        '<dt>Número</dt><dd>'+esc(r.numero)+'</dd>' +
        '<dt>Amperaje</dt><dd>'+(r.amperaje ? esc(r.amperaje) : (r.clase === "relevador" ? "No aplica (relevador)" : "No especificado"))+'</dd>' +
        '<dt>Tipo</dt><dd>'+(r.tipo ? esc(r.tipo) + (r.tipoFuente ? '<div class="small muted">'+esc(r.tipoFuente)+'</div>' : "") : "—")+'</dd>' +
        '<dt>Caja</dt><dd>'+esc(b.nombre)+'<div class="small muted">'+esc(b.ubicacion)+'</div></dd>' +
        (r.equipamiento ? '<dt>Equipamiento</dt><dd><span class="badge b-info">'+esc(r.equipamiento)+'</span></dd>' : "") +
        '<dt>Ubicación visual</dt><dd>Posición lógica en el esquema (orden numérico). <span class="muted">Posición física no verificada.</span></dd>' +
        '<dt>Fuente</dt><dd>'+esc(srcLabel(r.fuente))+'</dd>' +
      '</dl>' +
      (r.observaciones ? '<div class="callout pend">'+icon("warn")+'<div class="small"><b>Observación:</b> '+esc(r.observaciones)+'</div></div>' : "") +
      (r.id === "P-F86" ? '<div class="callout warn">'+icon("warn")+'<div class="small"><b>Bolsas de aire:</b> no manipule este circuito sin capacitación profesional.</div></div>' : "") +
      (r.fuente && r.tipo && r.tipo.indexOf("Cartucho") === 0 ? '<div class="callout warn">'+icon("warn")+'<div class="small">Fusible de alta corriente: el manual indica desconectar la batería antes de darle servicio.</div></div>' : "") +
      '<div class="btnrow" style="margin-top:14px">' +
        (opts.fromDiagram ? "" : '<a class="btn primary" href="#/caja/'+r.caja+'?sel='+encodeURIComponent(r.numero)+'" data-close>'+icon("target")+'Ver en diagrama</a>') +
        '<button class="btn" id="btnFav" aria-pressed="'+fav+'">'+icon("star")+(fav ? "En favoritos" : "Agregar a favoritos")+'</button>' +
      '</div>' +
      '<div class="section-title">Mi marca personal</div>' +
      '<div class="marks">' + ["revisado","correcto","danado","pendiente"].map(function(m){
        return '<button data-m="'+m+'" aria-pressed="'+(mark===m)+'">'+markLabel(m)+'</button>'; }).join("") + '</div>' +
      '<div class="section-title">Mis notas</div>' +
      '<textarea class="note-area" id="noteArea" placeholder="Notas personales (no modifican los datos técnicos)">'+esc(Store.getNote(id))+'</textarea>' +
      (rel.length ? '<div class="section-title">Diagnóstico relacionado</div><div class="list">' + rel.map(function(f){
        return '<a class="row" href="#/diag/'+f.id+'" data-close>'+icon(f.icono)+'<span class="grow"><span class="t">'+esc(f.titulo)+'</span></span>'+icon("chev").replace('<svg','<svg class="chev"')+'</a>'; }).join("") + '</div>' : "") +
      '<button class="btn block" style="margin-top:16px" data-close>Cerrar</button>';
    $sheet.innerHTML = h; $sheet.hidden = false; $bd.hidden = false; $sheet.scrollTop = 0;
    $sheet.setAttribute("data-id", id);
    $sheet.querySelector("#btnFav").onclick = function(){
      var on = Store.toggleFav(id); this.setAttribute("aria-pressed", on);
      this.innerHTML = icon("star") + (on ? "En favoritos" : "Agregar a favoritos");
      toast(on ? "Agregado a favoritos" : "Quitado de favoritos");
    };
    $sheet.querySelectorAll(".marks button").forEach(function(btn){
      btn.onclick = function(){
        var m = Store.setMark(id, btn.getAttribute("data-m"));
        $sheet.querySelectorAll(".marks button").forEach(function(x){ x.setAttribute("aria-pressed", x.getAttribute("data-m") === m); });
        if (currentDiagram) currentDiagram.setMarks(Store.get().marks);
        toast(m ? "Marcado: " + markLabel(m) : "Marca quitada");
      };
    });
    var na = $sheet.querySelector("#noteArea"), nt;
    na.oninput = function(){ clearTimeout(nt); nt = setTimeout(function(){ Store.setNote(id, na.value); }, 300); };
    na.onblur = function(){ Store.setNote(id, na.value); };
    if (currentDiagram && currentDiagram.box.id === r.caja) currentDiagram.select(id, false);
  }
  function closeSheet(){
    var na = $sheet.querySelector("#noteArea");
    if (na) Store.setNote($sheet.getAttribute("data-id"), na.value);
    $sheet.hidden = true; $bd.hidden = true; $sheet.innerHTML = "";
  }
  $bd.addEventListener("click", closeSheet);
  $sheet.addEventListener("click", function(e){
    var c = e.target.closest("[data-close]");
    if (!c) return;
    if (c.tagName === "A" && c.getAttribute("href")){ $sheet.hidden = true; $bd.hidden = true; return; } // la navegación cierra la ficha
    closeSheet();
  });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && !$sheet.hidden) closeSheet(); });
  document.addEventListener("click", function(e){
    var o = e.target.closest("[data-open]");
    if (o){ e.preventDefault(); openSheet(o.getAttribute("data-open")); }
  });

  /* ---------------- vistas ---------------- */
  function setView(html, title, back){
    if (currentDiagram){ currentDiagram = null; }
    $view.innerHTML = html;
    $view.classList.remove("view-enter"); void $view.offsetWidth; $view.classList.add("view-enter");
    $title.textContent = title || "Focus 2014";
    $back.hidden = !back;
    window.scrollTo(0, 0);
  }

  function vHome(){
    var tiles = [
      ["#/cajas","grid","Diagramas interactivos","3 cajas de fusibles"],
      ["#/buscar","search","Buscar fusible","Número, función o síntoma"],
      ["#/diag","pulse","Diagnóstico de fallas","Guía Sí / No / No sé"],
      ["#/fotos","camera","Fotografías y ubicaciones","Dónde está cada caja"],
      ["#/favoritos","heart","Mis favoritos","Favoritos, historial y marcas"],
      ["#/seguridad","shield","Guía de seguridad","Antes de tocar un fusible", "warn"]
    ];
    setView(
      '<div class="hero"><h1>Focus 2014<br>Fusibles &amp; Diagnóstico</h1><p>'+D.fuses.registros.filter(function(r){return r.estado==="activo";}).length+' fusibles y relevadores en uso · 3 cajas · datos del manual oficial Ford</p></div>' +
      '<div class="grid6">' + tiles.map(function(t){
        return '<a class="tile'+(t[4]?" "+t[4]:"")+'" href="'+t[0]+'"><span class="ico">'+icon(t[1])+'</span><span><strong>'+t[2]+'</strong><small>'+t[3]+'</small></span></a>';
      }).join("") + '</div>' +
      '<a class="callout" href="#/diag/encendido-remoto">'+icon("remote")+'<div><b>Guía especial: encendido remoto</b><div class="small">El control abre y cierra, pero al intentar el arranque remoto pita y destellan las luces.</div></div></a>' +
      '<a class="callout pend" href="#/fuentes">'+icon("info")+'<div><b>Fuentes, versión y limitaciones</b><div class="small">v'+APP_VERSION+' · Esquemas lógicos (posición física no verificada) · 8 discrepancias documentadas.</div></div></a>',
      "Focus 2014", false);
  }

  function vCajas(){
    setView('<p class="lead">Elija una caja para ver su esquema interactivo. Toque un fusible para ver su ficha.</p><div class="list">' +
      D.boxes.cajas.map(function(b){
        var n = D.fuses.registros.filter(function(r){ return r.caja === b.id && r.estado === "activo"; }).length;
        return '<a class="row" href="#/caja/'+b.id+'"><span class="num">'+({M:"A",P:"B",C:"C"}[b.id])+'</span><span class="grow"><span class="t">'+esc(b.nombre)+'</span><span class="s">'+n+' en uso · '+esc(b.ubicacion)+'</span></span>'+icon("chev").replace('<svg','<svg class="chev"')+'</a>';
      }).join("") + '</div>', "Diagramas", true);
  }

  function vCaja(id, params){
    var b = boxById(id); if (!b) return vNotFound();
    var mode = params.modo === "foto" ? "foto" : "diagrama";
    setView(
      '<div class="diag-head"><div class="seg" style="flex:1" role="group" aria-label="Vista">' +
        '<button data-mode="diagrama" aria-pressed="'+(mode==="diagrama")+'">Diagrama</button>' +
        '<button data-mode="foto" aria-pressed="'+(mode==="foto")+'">Fotografía</button></div></div>' +
      '<div id="diagArea"></div>' +
      '<div class="diag-note">'+icon("info").replace('<svg','<svg style="width:16px;height:16px;vertical-align:-3px"')+' <b>Esquema lógico original</b>: los números y datos son del manual Ford, pero el orden es numérico. La disposición física real no está verificada: confírmela con la etiqueta de la tapa de la caja.</div>' +
      '<div class="legend"><span><i style="background:#1a73e8"></i>Fusible (color = amperaje)</span><span><i style="background:#2b3442"></i>Relevador</span><span><i style="background:repeating-linear-gradient(45deg,var(--surface2) 0 3px,var(--line) 3px 5px)"></i>Sin uso</span><span><i style="border:2px dashed var(--ink3)"></i>Repuesto</span><span><i style="background:var(--warn);border-radius:50%;width:10px;height:10px"></i>Mi marca</span></div>' +
      '<div class="card" style="margin-top:14px"><b>Ubicación:</b> '+esc(b.ubicacion)+'<div class="small" style="margin-top:6px"><b>Acceso:</b> '+esc(b.acceso)+'</div><div class="small muted" style="margin-top:6px">Fuente: '+esc(srcLabel(b.fuente))+'</div></div>',
      b.nombre, true);
    $view.querySelectorAll(".seg button").forEach(function(btn){
      btn.onclick = function(){ location.hash = "#/caja/" + id + (btn.getAttribute("data-mode") === "foto" ? "?modo=foto" : ""); };
    });
    var area = document.getElementById("diagArea");
    if (mode === "foto"){ renderBoxPhotos(area, b); return; }
    area.innerHTML = '<div class="diag-wrap" id="diagWrap"></div><div class="zoombar">' +
      '<button id="zIn" aria-label="Acercar">+</button><button id="zOut" aria-label="Alejar">−</button><button id="zFit" aria-label="Vista completa">'+icon("expand")+'<span>Vista completa</span></button></div>';
    var wrap = document.getElementById("diagWrap");
    var dg = new Diagram(wrap, b, D.fuses.registros, { onSelect: function(fid){ dg.select(fid, false); openSheet(fid, { fromDiagram:true }); } });
    dg.setMarks(Store.get().marks);
    currentDiagram = dg; window.__diagram = dg;
    // El diagrama ocupa todo el ancho; la altura sigue la proporción de la caja para que los números se lean sin zoom
    function fit(){ if (!wrap.isConnected) return window.removeEventListener("resize", fit); wrap.style.height = Math.max(280, Math.round(wrap.clientWidth * dg.H / dg.W)) + "px"; }
    fit(); window.addEventListener("resize", fit);
    document.getElementById("zIn").onclick = function(){ dg.zoomBy(1.4); };
    document.getElementById("zOut").onclick = function(){ dg.zoomBy(1/1.4); };
    document.getElementById("zFit").onclick = function(){ dg.reset(); };
    if (params.sel){
      var target = id + "-" + params.sel.toUpperCase();
      if (D.byId[target]) setTimeout(function(){ dg.select(target, true); }, 60);
    }
  }

  function vBuscar(params){
    var q = params.q || "";
    setView('<label class="searchbox">'+icon("search")+'<input id="q" type="search" inputmode="search" autocomplete="off" placeholder="Ej. claxon, F13, 20A, radio, fuel pump" value="'+esc(q)+'" aria-label="Buscar fusible o relevador"></label>' +
      '<div class="chips">' + ["Radio","Claxon","Limpiaparabrisas","Luces","Arranque","Encendido remoto","Seguros","Aire acondicionado","Ventanas","Bomba de gasolina"].map(function(c){
        return '<button class="chip" data-q="'+c+'">'+c+'</button>'; }).join("") + '</div><div id="results"></div>', "Buscar fusible", true);
    var inp = document.getElementById("q"), out = document.getElementById("results");
    function run(){
      var v = inp.value, res = search(v);
      history.replaceState(null, "", "#/buscar" + (v ? "?q=" + encodeURIComponent(v) : ""));
      if (!norm(v)){ out.innerHTML = '<div class="empty">Escriba un número (F13, R10), un amperaje (20A) o una función, en español o inglés.</div>'; return; }
      var h = "";
      if (res.faults.length) h += '<div class="section-title">Diagnóstico relacionado</div><div class="list">' + res.faults.map(function(f){
        return '<a class="row" href="#/diag/'+f.id+'">'+icon(f.icono)+'<span class="grow"><span class="t">'+esc(f.titulo)+'</span><span class="s">Guía paso a paso</span></span>'+icon("chev").replace('<svg','<svg class="chev"')+'</a>'; }).join("") + '</div>';
      if (/remot/.test(norm(v))) h += '<div class="callout pend">'+icon("info")+'<div class="small">Las tablas de Ford <b>no documentan un fusible dedicado al arranque remoto</b>. Use la guía de diagnóstico; no confunda el relevador del motor de arranque (F13 / R10) con el control del arranque remoto.</div></div>';
      h += '<div class="section-title">'+res.fuses.length+' resultado'+(res.fuses.length===1?"":"s")+'</div>';
      h += res.fuses.length ? '<div class="list">' + res.fuses.slice(0, 60).map(function(r){ return fuseRow(r); }).join("") + '</div>' : '<div class="empty">Sin resultados. Pruebe otro término o el número del fusible.</div>';
      out.innerHTML = h;
    }
    var deb; inp.addEventListener("input", function(){ clearTimeout(deb); deb = setTimeout(run, 120); });
    $view.querySelectorAll(".chip").forEach(function(c){ c.onclick = function(){ inp.value = c.getAttribute("data-q"); run(); }; });
    run();
    if (!q) setTimeout(function(){ inp.focus(); }, 50);
  }

  function vDiagList(){
    setView('<p class="lead">Elija el síntoma. Responda Sí, No o No sé. El resultado es <b>orientativo</b>: nunca confirma la causa.</p><div class="list">' +
      D.diag.fallas.map(function(f){
        return '<a class="row" href="#/diag/'+f.id+'" style="'+(f.especial?"border-color:var(--accent)":"")+'"><span class="num" style="min-width:46px">'+icon(f.icono)+'</span><span class="grow"><span class="t">'+esc(f.titulo)+(f.especial?' <span class="badge b-info">Guía especial</span>':"")+'</span><span class="s">'+esc(f.intro)+'</span></span>'+icon("chev").replace('<svg','<svg class="chev"')+'</a>';
      }).join("") + '</div>', "Diagnóstico", true);
  }

  function vDiag(id){
    var f = D.diag.fallas.filter(function(x){ return x.id === id; })[0];
    if (!f) return vNotFound();
    if (!diagState || diagState.id !== id) diagState = { id:id, q:f.preguntas[0].id, path:[], hyps:[] };
    renderQuestion(f);
  }
  function renderQuestion(f){
    var st = diagState;
    if (st.q === null) return renderResult(f);
    var q = f.preguntas.filter(function(x){ return x.id === st.q; })[0];
    var total = Math.max(st.path.length + 1, Math.min(f.preguntas.length, st.path.length + 3));
    var pct = Math.round(100 * st.path.length / (st.path.length + Math.max(1, countRemaining(f, st.q))));
    setView(
      (f.especial && st.path.length === 0 ? '<div class="card" style="margin-bottom:12px"><b>Su síntoma</b><p class="small" style="margin:6px 0 0">'+esc(f.intro)+'</p></div>' : "") +
      '<div class="card q-card"><div class="q-progress"><div style="width:'+pct+'%"></div></div>' +
      '<div class="small muted">Pregunta '+(st.path.length+1)+'</div>' +
      '<div class="q-text" id="qText">'+esc(q.texto)+'</div>' + (q.ayuda ? '<div class="q-help">'+esc(q.ayuda)+'</div>' : "") +
      '<div class="answers"><button class="btn ans-yes" data-a="si">Sí</button><button class="btn ans-no" data-a="no">No</button><button class="btn" data-a="nose">No sé</button></div></div>' +
      '<div class="btnrow" style="margin-top:12px">' + (st.path.length ? '<button class="btn" id="qPrev">Pregunta anterior</button>' : "") + '<button class="btn" id="qRestart">Reiniciar</button></div>' +
      '<p class="small muted" style="margin-top:14px">'+esc(D.diag.aviso)+'</p>', f.titulo, true);
    $view.querySelectorAll("[data-a]").forEach(function(b){
      b.onclick = function(){
        var a = q[b.getAttribute("data-a")] || {};
        st.path.push({ q:q.id, a:b.getAttribute("data-a"), add:(a.agrega||[]) });
        st.q = a.sig === undefined ? null : a.sig;
        renderQuestion(f);
      };
    });
    var p = document.getElementById("qPrev");
    if (p) p.onclick = function(){ var last = st.path.pop(); st.q = last.q; renderQuestion(f); };
    document.getElementById("qRestart").onclick = function(){ diagState = null; vDiag(f.id); };
  }
  function countRemaining(f, qid){
    var seen = {}, n = 0, cur = qid;
    while (cur && !seen[cur] && n < 30){ seen[cur] = 1; n++; var q = f.preguntas.filter(function(x){ return x.id === cur; })[0]; cur = q && q.si ? q.si.sig : null; }
    return n;
  }
  function renderResult(f){
    var st = diagState, hy = [];
    st.path.forEach(function(p){ p.add.forEach(function(h){ if (hy.indexOf(h) < 0) hy.push(h); }); });
    var groups = { documentada:[], hipotesis:[], info:[] };
    hy.forEach(function(h){ var o = f.hipotesis[h]; if (o) groups[o.tipo].push(o); });
    function hypHTML(arr, cls){ return arr.map(function(o){ return '<div class="hyp '+cls+'">'+esc(o.texto)+(o.fuente ? '<div class="src">Fuente: '+esc(srcLabel(o.fuente))+'</div>' : "")+'</div>'; }).join(""); }
    var fus = (f.fusibles||[]).filter(function(x){ return !x.cuando || x.cuando.some(function(c){ return hy.indexOf(c) >= 0; }); });
    function fusList(arr){ return '<div class="list">' + arr.map(function(x){ var r = D.byId[x.id]; return r ? fuseRow(r, esc(x.por)) : ""; }).join("") + '</div>'; }
    var h = '<div class="card"><div class="small muted">Resultado orientativo</div><h2 style="margin-top:4px">'+esc(f.titulo)+'</h2>' +
      '<p class="small" style="margin-bottom:0">Respondió '+st.path.length+' pregunta'+(st.path.length===1?"":"s")+'. Ninguna de estas posibles causas está confirmada.</p></div>';
    if (f.interpretacion) h += '<div class="callout">'+icon("info")+'<div class="small"><b>Qué dice el manual sobre su síntoma:</b> '+esc(f.interpretacion)+'<div class="muted" style="margin-top:4px">Fuente: '+esc(srcLabel({id:"OM2014v3",pagina:64}))+'</div></div></div>';
    if (f.nota) h += '<div class="callout pend">'+icon("info")+'<div class="small">'+esc(f.nota)+'</div></div>';
    if (groups.info.length) h += '<div class="section-title">Información</div>' + hypHTML(groups.info, "info");
    if (groups.documentada.length) h += '<div class="section-title">Condiciones documentadas por Ford</div>' + hypHTML(groups.documentada, "documentada");
    if (groups.hipotesis.length) h += '<div class="section-title">Hipótesis por verificar</div>' + hypHTML(groups.hipotesis, "hipotesis");
    if (!hy.length) h += '<div class="section-title">Posibles causas</div><div class="hyp info">Sus respuestas no señalaron una condición específica. Revise las comprobaciones básicas; si la falla persiste, acuda a un técnico.</div>';
    if (fus.length) h += '<div class="section-title">Fusibles y relevadores documentados relacionados</div><p class="small muted" style="margin:0 4px 8px">El manual indica que protegen el componente descrito; no implica que estén fundidos.</p>' + fusList(fus);
    else if (f.id === "encendido-remoto" || f.especial) h += '<div class="section-title">Fusibles</div><div class="hyp info">Las tablas de Ford no documentan un fusible dedicado al arranque remoto'+(hy.indexOf("posventa")>=0?"; un sistema instalado posteriormente tiene sus propios fusibles en línea":"")+'.</div>';
    if (f.noConfundir && f.noConfundir.length) h += '<div class="section-title">No confundir</div>' + fusList(f.noConfundir);
    if (f.comprobaciones) h += '<div class="section-title">Comprobaciones básicas seguras</div><div class="card"><ul class="clean">' + f.comprobaciones.map(function(c){ return '<li>'+esc(c)+'</li>'; }).join("") + '</ul></div>';
    if (f.tecnico) h += '<div class="section-title">Requiere técnico automotriz</div><div class="card"><ul class="clean">' + f.tecnico.map(function(c){ return '<li>'+esc(c)+'</li>'; }).join("") + '</ul></div>';
    if (f.prohibido) h += '<div class="callout warn">'+icon("warn")+'<div class="small"><b>No haga esto:</b> '+esc(f.prohibido)+'</div></div>';
    var boxesUsed = []; fus.forEach(function(x){ var c = x.id.charAt(0); if (boxesUsed.indexOf(c) < 0) boxesUsed.push(c); });
    if (boxesUsed.length) h += '<div class="section-title">Abrir diagrama</div><div class="btnrow">' + boxesUsed.map(function(c){ return '<a class="btn" href="#/caja/'+c+'">'+icon("grid")+esc(boxById(c).nombre)+'</a>'; }).join("") + '</div>';
    h += '<div class="btnrow" style="margin-top:16px"><button class="btn" id="qPrev">Cambiar última respuesta</button><button class="btn primary" id="qRestart">Reiniciar</button></div>' +
      '<p class="small muted" style="margin-top:14px">'+esc(D.diag.aviso)+'</p>';
    setView(h, f.titulo, true);
    document.getElementById("qPrev").onclick = function(){ var last = st.path.pop(); st.q = last.q; renderQuestion(f); };
    document.getElementById("qRestart").onclick = function(){ diagState = null; vDiag(f.id); };
  }

  /* ---- fotos ---- */
  function renderBoxPhotos(area, b){
    var F = D.content.fotos;
    area.innerHTML = '<div class="callout pend">'+icon("camera")+'<div class="small">'+esc(F.nota)+'</div></div><div class="photo-grid" style="margin-top:12px">' +
      F.espacios.map(function(s){ return '<div class="photo-slot" data-key="'+b.id+':'+s.id+'"><b>'+esc(s.titulo)+'</b><span class="badge b-pend">Pendiente</span><label>Agregar mi foto<input type="file" accept="image/*" capture="environment" hidden></label></div>'; }).join("") + '</div>';
    area.querySelectorAll(".photo-slot").forEach(function(slot){ fillSlot(slot); });
  }
  function fillSlot(slot){
    var key = slot.getAttribute("data-key"), title = slot.querySelector("b") ? slot.querySelector("b").textContent : "";
    slot._title = slot._title || title;
    var inp = slot.querySelector("input");
    if (inp) inp.onchange = function(){
      var file = inp.files[0]; if (!file) return;
      shrink(file).then(function(blob){ return Store.photos.put(key, blob); }).then(function(){ toast("Foto guardada en este teléfono"); fillSlot(slot); })
        .catch(function(e){ toast("No se pudo guardar la foto: " + e.message); });
    };
    Store.photos.get(key).then(function(rec){
      if (!rec) return;
      var url = URL.createObjectURL(rec.blob);
      slot.classList.add("has");
      slot.innerHTML = '<img alt="'+esc(slot._title)+' (foto del usuario)" src="'+url+'"><div class="cap">'+esc(slot._title)+' · Foto del usuario</div><button class="del" aria-label="Eliminar foto">✕</button>';
      slot.querySelector("img").onclick = function(){ var lb = document.getElementById("lightbox"); lb.querySelector("img").src = url; lb.hidden = false; };
      slot.querySelector(".del").onclick = function(){
        if (!confirm("¿Eliminar esta foto de su teléfono?")) return;
        Store.photos.del(key).then(function(){ slot.classList.remove("has"); slot.innerHTML = '<b>'+esc(slot._title)+'</b><span class="badge b-pend">Pendiente</span><label>Agregar mi foto<input type="file" accept="image/*" capture="environment" hidden></label>'; fillSlot(slot); });
      };
    }).catch(function(){});
  }
  function shrink(file){
    return new Promise(function(res){
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function(){
        var M = 1600, k = Math.min(1, M / Math.max(img.width, img.height));
        var c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function(b){ URL.revokeObjectURL(u); res(b || file); }, "image/jpeg", 0.85);
      };
      img.onerror = function(){ res(file); };
      img.src = u;
    });
  }
  document.getElementById("lbClose").onclick = function(){ document.getElementById("lightbox").hidden = true; };
  document.getElementById("lightbox").onclick = function(e){ if (e.target === this) this.hidden = true; };

  function vFotos(){
    setView('<p class="lead">Ubicación de cada caja según el manual Ford. Puede agregar sus propias fotografías: se guardan solo en este teléfono.</p>' +
      D.boxes.cajas.map(function(b){
        return '<div class="section-title">'+esc(b.nombre)+'</div><div class="card"><b>Ubicación:</b> '+esc(b.ubicacion)+'<div class="small" style="margin-top:6px"><b>Acceso:</b> '+esc(b.acceso)+'</div><div class="small muted" style="margin-top:6px">Fuente: '+esc(srcLabel(b.fuente))+'</div></div><div class="photos" data-box="'+b.id+'" style="margin-top:10px"></div>';
      }).join(""), "Fotografías y ubicaciones", true);
    $view.querySelectorAll(".photos").forEach(function(p){ renderBoxPhotos(p, boxById(p.getAttribute("data-box"))); });
  }

  function vFavoritos(params){
    var tab = params.tab || "fav", u = Store.get();
    var h = '<div class="seg" role="tablist">' + [["fav","Favoritos"],["hist","Historial"],["marcas","Marcas y notas"]].map(function(t){
      return '<button data-tab="'+t[0]+'" aria-pressed="'+(tab===t[0])+'">'+t[1]+'</button>'; }).join("") + '</div><div style="margin-top:14px">';
    if (tab === "fav"){
      h += u.favs.length ? '<div class="list">' + u.favs.map(function(id){ return D.byId[id] ? fuseRow(D.byId[id]) : ""; }).join("") + '</div>' : '<div class="empty">Aún no tiene favoritos. Abra la ficha de un fusible y toque “Agregar a favoritos”.</div>';
    } else if (tab === "hist"){
      h += u.hist.length ? '<div class="list">' + u.hist.map(function(x){ var r = D.byId[x.id]; return r ? fuseRow(r, new Date(x.t).toLocaleString("es-MX",{dateStyle:"short",timeStyle:"short"})) : ""; }).join("") + '</div><button class="btn block" id="clearHist" style="margin-top:12px">Borrar historial</button>' : '<div class="empty">Sin consultas recientes.</div>';
    } else {
      var ids = Object.keys(u.marks).concat(Object.keys(u.notes)).filter(function(v,i,a){ return a.indexOf(v) === i && D.byId[v]; });
      h += ids.length ? '<div class="list">' + ids.map(function(id){ var n = u.notes[id]; return fuseRow(D.byId[id], (u.marks[id] ? markLabel(u.marks[id]) : "") + (n ? (u.marks[id] ? " · " : "") + "Nota: " + esc(n.slice(0, 60)) : "")); }).join("") + '</div>' : '<div class="empty">No ha marcado fusibles ni escrito notas.</div>';
    }
    h += '</div><div class="section-title">Restablecer</div><button class="btn danger block" id="resetAll">Borrar favoritos, historial, marcas y notas</button>';
    setView(h, "Mis fusibles", true);
    $view.querySelectorAll("[data-tab]").forEach(function(b){ b.onclick = function(){ location.hash = "#/favoritos?tab=" + b.getAttribute("data-tab"); }; });
    var ch = document.getElementById("clearHist"); if (ch) ch.onclick = function(){ if (confirm("¿Borrar el historial?")){ Store.clearHist(); vFavoritos(params); } };
    document.getElementById("resetAll").onclick = resetAll;
  }
  function resetAll(){
    if (!confirm("Se borrarán sus favoritos, historial, marcas, notas y fotos agregadas. Los datos técnicos no se modifican. ¿Continuar?")) return;
    Store.resetAll(); Store.photos.clear().catch(function(){}); toast("Datos personales borrados"); route();
  }

  function vSeguridad(){
    var C = D.content;
    var swatch = { "Gris":"#9aa0a6","Violeta":"#8e5bd6","Rosa":"#f48fb1","Marrón claro (tan)":"#c8a26b","Café":"#7b4a2a","Rojo":"#d93025","Azul":"#1a73e8","Amarillo":"#f9c80e","Natural (incoloro)":"#e8e4d8","Natural":"#e8e4d8","Verde":"#2e9d4f" };
    function sw(n){ return n ? '<span class="sw" style="background:'+(swatch[n]||"#ccc")+'"></span>'+esc(n) : '<span class="muted">—</span>'; }
    setView('<div class="callout warn">'+icon("warn")+'<div class="small"><b>Lea esto antes de tocar cualquier fusible.</b> Si tiene dudas, consulte a un técnico.</div></div>' +
      '<div class="section-title">Advertencias</div>' +
      C.seguridad.map(function(s){ return '<div class="safety '+s.nivel+'"><span class="lv"></span><div><b>'+esc(s.titulo)+'</b><div class="small" style="margin-top:3px">'+esc(s.texto)+'</div></div></div>'; }).join("") +
      '<div class="section-title">Qué puede hacer usted y qué no</div><div class="card"><p style="margin-top:0"><span class="badge b-ok">Sencillo</span> '+esc(C.niveles.sencillo)+'</p><p style="margin-bottom:0"><span class="badge b-warn">Especializado</span> '+esc(C.niveles.especializado)+'</p></div>' +
      '<div class="section-title">Guía básica</div>' +
      C.guia.map(function(g){ return '<div class="card"><b>'+esc(g.titulo)+'</b><p class="small" style="margin:6px 0 0">'+esc(g.texto)+'</p></div>'; }).join("") +
      '<div class="card"><table class="colors"><thead><tr><th>Amperaje</th><th>Mini</th><th>Cartucho</th></tr></thead><tbody>' +
      C.colores.map(function(c){ return '<tr><td><b>'+c.amp+'</b></td><td>'+sw(c.mini)+'</td><td>'+sw(c.cartucho)+'</td></tr>'; }).join("") +
      '</tbody></table><div class="small muted" style="margin-top:8px">Fuente: '+esc(srcLabel(C.coloresFuente))+'</div></div>', "Guía de seguridad", true);
  }

  function vFuentes(){
    var disc = D.fuses.registros.filter(function(r){ return r.verificacion === "discrepancia"; });
    setView('<div class="card"><b>Ford Focus 2014 — Fusibles &amp; Diagnóstico v'+APP_VERSION+'</b><div class="small muted">Datos: '+esc(D.fuses.vehiculo)+' · actualizados '+esc(D.fuses.actualizado)+'</div></div>' +
      '<div class="section-title">Fuentes</div>' + D.sources.fuentes.map(function(s){
        return '<div class="card"><b>'+esc(s.titulo)+'</b> <span class="badge '+(s.prioridad===1?"b-ok":s.prioridad===2?"b-info":"b-pend")+'">'+esc(s.tipo)+'</span><p class="small" style="margin:6px 0">'+esc(s.consulta)+'</p><a class="small" href="'+esc(s.url)+'" target="_blank" rel="noopener">Abrir fuente (requiere internet)</a></div>'; }).join("") +
      '<div class="section-title">Discrepancias entre fuentes ('+disc.length+')</div><div class="list">' + disc.map(function(r){ return fuseRow(r); }).join("") + '</div>' +
      '<div class="section-title">Limitaciones conocidas</div><div class="card"><ul class="clean small">' +
      '<li>Los diagramas son <b>esquemas lógicos</b> (orden numérico). La disposición física de las cajas no está verificada.</li>' +
      '<li>Datos del manual para EE. UU. (v.3). Las diferencias del mercado mexicano no se verificaron (el manual en español no fue accesible).</li>' +
      '<li>No hay fotografías con licencia incluidas; puede agregar las suyas.</li>' +
      '<li>El manual no documenta un fusible específico para el arranque remoto.</li>' +
      '<li>El diagnóstico es orientativo y no reemplaza a un técnico ni a un escáner.</li></ul></div>' +
      '<div class="section-title">Funcionamiento sin conexión</div><div class="card small" id="offDetail">Comprobando…</div>' +
      '<div class="section-title">Restablecer</div><button class="btn danger block" id="resetAll">Borrar mis datos personales</button>', "Fuentes y versión", true);
    document.getElementById("resetAll").onclick = resetAll;
    checkOffline(true);
  }
  function vNotFound(){ setView('<div class="empty">Página no encontrada. <a href="#/">Ir al inicio</a></div>', "Focus 2014", true); }

  /* ---------------- enrutador ---------------- */
  function parse(){
    var h = location.hash.replace(/^#/, "") || "/", qi = h.indexOf("?"), path = qi >= 0 ? h.slice(0, qi) : h, params = {};
    if (qi >= 0) h.slice(qi + 1).split("&").forEach(function(kv){ var p = kv.split("="); if (p[0]) params[decodeURIComponent(p[0])] = decodeURIComponent((p[1]||"").replace(/\+/g," ")); });
    return { parts: path.split("/").filter(Boolean), params: params };
  }
  function route(){
    if ($sheet.innerHTML) closeSheet();
    var r = parse(), p = r.parts, nav = p[0] || "home";
    document.querySelectorAll(".bottomnav a").forEach(function(a){
      var n = a.getAttribute("data-nav");
      a.classList.toggle("active", n === nav || (n === "cajas" && nav === "caja"));
    });
    if (!p.length) return vHome();
    switch (p[0]){
      case "cajas": return vCajas();
      case "caja": return vCaja(p[1], r.params);
      case "buscar": return vBuscar(r.params);
      case "diag": return p[1] ? vDiag(p[1]) : vDiagList();
      case "fotos": return vFotos();
      case "favoritos": return vFavoritos(r.params);
      case "seguridad": return vSeguridad();
      case "fuentes": return vFuentes();
      default: return vNotFound();
    }
  }
  $back.addEventListener("click", function(){ if (history.length > 1) history.back(); else location.hash = "#/"; });
  window.addEventListener("hashchange", route);

  /* ---------------- sin conexión ---------------- */
  var $pill = document.getElementById("offlinePill");
  function checkOffline(detail){
    var out = document.getElementById("offDetail");
    if (location.protocol === "file:" || !("serviceWorker" in navigator) || !window.caches || !window.isSecureContext){
      $pill.textContent = "Sin modo offline"; $pill.className = "offline-pill no";
      if (out) out.innerHTML = "Este navegador o esta dirección no permiten Service Workers. La app debe abrirse desde <b>https://</b> (o localhost) para guardarse sin conexión. Abrir el archivo con <code>file://</code> no equivale a instalarla.";
      return Promise.resolve(false);
    }
    return caches.open(CACHE_NAME).then(function(c){
      return Promise.all(F14_ASSETS.map(function(u){ return c.match(u).then(function(m){ return { u:u, ok:!!m }; }); }));
    }).then(function(list){
      var ok = list.filter(function(x){ return x.ok; }).length, all = ok === list.length;
      $pill.textContent = all ? "✓ Offline listo" : "Preparando " + ok + "/" + list.length;
      $pill.className = "offline-pill " + (all ? "ok" : "no");
      if (out) out.innerHTML = (all ? '<span class="badge b-ok">Listo</span> Todos los recursos ('+ok+') están guardados en el teléfono.' : '<span class="badge b-pend">Incompleto</span> '+ok+' de '+list.length+' recursos guardados. Mantenga la conexión unos segundos.') +
        '<div class="muted" style="margin-top:6px">Faltantes: '+(list.filter(function(x){ return !x.ok; }).map(function(x){ return esc(x.u); }).join(", ") || "ninguno")+'</div>';
      return all;
    });
  }
  function initSW(){
    if (location.protocol === "file:" || !("serviceWorker" in navigator) || !window.isSecureContext){ checkOffline(); return; }
    navigator.serviceWorker.register("sw.js").then(function(reg){
      function poll(n){ checkOffline().then(function(ok){ if (!ok && n > 0) setTimeout(function(){ poll(n-1); }, 1500); }); }
      poll(12);
      reg.addEventListener("updatefound", function(){
        var nw = reg.installing;
        nw && nw.addEventListener("statechange", function(){ if (nw.state === "installed" && navigator.serviceWorker.controller) toast("Nueva versión lista: cierre y vuelva a abrir la app"); });
      });
    }).catch(function(){ checkOffline(); });
  }

  /* ---------------- inicio ---------------- */
  applyTheme();
  if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener && matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  loadAll().then(function(){ route(); initSW(); }).catch(function(err){
    $view.innerHTML = '<div class="card"><b>No se pudieron cargar los datos técnicos.</b><p class="small">'+esc(err.message)+'</p><p class="small">Si abrió el archivo directamente (file://), el navegador bloquea la lectura de los datos. Publique la carpeta en un sitio HTTPS (vea LEEME.md) o ábrala con un servidor local.</p></div>';
    checkOffline();
  });

  // ganchos para pruebas automatizadas
  window.__app = { D:D, search:search, openSheet:openSheet, route:route };
})();
