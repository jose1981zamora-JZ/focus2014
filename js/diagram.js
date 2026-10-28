/* Diagrama interactivo SVG original: esquema lógico por número, con zoom y desplazamiento táctil. */
(function(){
  var NS = "http://www.w3.org/2000/svg";
  // Colores estándar del manual (pág. 223): mini y cartucho
  var MINI = {"2A":"#9aa0a6","3A":"#8e5bd6","4A":"#f48fb1","5A":"#c8a26b","7.5A":"#7b4a2a","10A":"#d93025","15A":"#1a73e8","20A":"#f9c80e","25A":"#e8e4d8","30A":"#2e9d4f"};
  var CART = {"20A":"#1a73e8","25A":"#e8e4d8","30A":"#f48fb1","40A":"#2e9d4f","50A":"#d93025","60A":"#f9c80e"};
  var DARK = ["#8e5bd6","#7b4a2a","#d93025","#1a73e8","#2e9d4f"];
  var SIZES = { cartucho:{w:86,h:52}, mini:{w:64,h:42}, relevadores:{w:86,h:62} };
  var GAP = 10, PAD = 20, TITLE = 30;

  function el(tag, attrs, parent){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fuseColor(r){
    if (r.clase !== "fusible" || !r.amperaje) return null;
    if (r.tipo && r.tipo.indexOf("Cartucho") === 0) return CART[r.amperaje] || "#ccc";
    return MINI[r.amperaje] || "#ccc";
  }

  function Diagram(host, box, recs, opts){
    this.host = host; this.box = box; this.opts = opts || {};
    this.s = 1; this.tx = 0; this.ty = 0; this.cells = {};
    this.build(recs);
    this.bind();
  }

  Diagram.colorFor = fuseColor;
  Diagram.isDark = function(c){ return DARK.indexOf(c) >= 0; };

  Diagram.prototype.build = function(recs){
    var self = this, box = this.box, y = PAD, maxW = 0, layout = [];
    box.secciones.forEach(function(sec){
      var items = recs.filter(function(r){ return r.caja === box.id && r.seccion === sec.id; })
                      .sort(function(a,b){ return a.orden - b.orden; });
      if (!items.length) return;
      var sz = SIZES[sec.id] || SIZES.mini, cols = sec.cols;
      var rows = Math.ceil(items.length / cols);
      var w = cols * (sz.w + GAP) - GAP;
      layout.push({ sec: sec, items: items, sz: sz, cols: cols, y: y });
      y += TITLE + rows * (sz.h + GAP) - GAP + 26;
      maxW = Math.max(maxW, w);
    });
    var W = maxW + PAD * 2, H = y - 6;
    this.W = W; this.H = H;

    var svg = el("svg", { "class":"board", viewBox:"0 0 "+W+" "+H, preserveAspectRatio:"xMidYMid meet", role:"img",
      "aria-label":"Esquema de la caja: " + box.nombre });
    var defs = el("defs", {}, svg);
    var pat = el("pattern", { id:"hatch", width:"10", height:"10", patternUnits:"userSpaceOnUse", patternTransform:"rotate(45)" }, defs);
    el("rect", { width:"10", height:"10", fill:"var(--surface2)" }, pat);
    el("line", { x1:"0", y1:"0", x2:"0", y2:"10", stroke:"var(--line)", "stroke-width":"1.5" }, pat);

    var vp = el("g", { "class":"vp" }, svg);
    el("rect", { "class":"box-frame", x:"4", y:"4", width:W-8, height:H-8, rx:"18" }, vp);

    layout.forEach(function(L){
      var x0 = PAD + 0;
      var t = el("text", { "class":"sec-title", x:x0, y:L.y + 16 }, vp);
      t.textContent = L.sec.titulo;
      L.items.forEach(function(r, i){
        var cx = x0 + (i % L.cols) * (L.sz.w + GAP);
        var cy = L.y + TITLE + Math.floor(i / L.cols) * (L.sz.h + GAP);
        var color = fuseColor(r);
        var cls = "cell";
        if (r.clase === "relevador" && r.estado !== "sin-uso") cls += " relay";
        if (r.estado === "sin-uso") cls += " unused";
        if (r.estado === "repuesto") cls += " spare";
        if (color && Diagram.isDark(color)) cls += " dark-amp";
        var g = el("g", { "class":cls, "data-id":r.id, tabindex:"0", role:"button",
          "aria-label": r.numero + " " + (r.amperaje || "") + " " + r.funcion_es,
          transform:"translate("+cx+","+cy+")" }, vp);
        el("rect", { "class":"halo", x:"-5", y:"-5", width:L.sz.w+10, height:L.sz.h+10, rx:"12" }, g);
        var body = el("rect", { "class":"body", width:L.sz.w, height:L.sz.h, rx: r.clase === "relevador" ? "6" : "9" }, g);
        if (color) body.setAttribute("fill", color);
        if (r.clase === "fusible" && r.estado !== "sin-uso"){
          // ventana del fusible
          el("rect", { x: L.sz.w/2 - 7, y:"5", width:"14", height:"6", rx:"2", fill:"rgba(255,255,255,.55)", "pointer-events":"none" }, g);
        }
        var lbl = el("text", { "class":"lbl", x:L.sz.w/2, y: L.sz.h/2 + (r.amperaje || r.clase==="relevador" ? 2 : 5), "text-anchor":"middle" }, g);
        lbl.textContent = r.numero;
        var sub = r.amperaje || (r.clase === "relevador" && r.estado !== "sin-uso" ? "relé" : (r.estado === "sin-uso" ? "" : ""));
        if (sub){
          var at = el("text", { "class":"amp-t", x:L.sz.w/2, y:L.sz.h/2 + 16, "text-anchor":"middle" }, g);
          at.textContent = sub;
        }
        el("circle", { "class":"mark-dot", cx:L.sz.w - 7, cy:"7", r:"5", fill:"transparent" }, g);
        self.cells[r.id] = { g:g, x:cx, y:cy, w:L.sz.w, h:L.sz.h };
      });
    });
    this.svg = svg; this.vp = vp;
    this.host.appendChild(svg);
  };

  Diagram.prototype.apply = function(){
    this.vp.setAttribute("transform", "matrix("+this.s+",0,0,"+this.s+","+this.tx+","+this.ty+")");
  };
  Diagram.prototype.clamp = function(){
    this.s = Math.min(6, Math.max(1, this.s));
    var minX = this.W - this.W * this.s, minY = this.H - this.H * this.s;
    this.tx = Math.min(0, Math.max(minX, this.tx));
    this.ty = Math.min(0, Math.max(minY, this.ty));
  };
  Diagram.prototype.scaleRoot = function(){
    var m = this.svg.getScreenCTM(); return m ? m.a : 1;
  };
  Diagram.prototype.toVB = function(clientX, clientY){
    var m = this.svg.getScreenCTM();
    if (!m) return { x:0, y:0 };
    var p = this.svg.createSVGPoint(); p.x = clientX; p.y = clientY;
    p = p.matrixTransform(m.inverse());
    return { x:p.x, y:p.y };
  };
  Diagram.prototype.zoomAt = function(factor, vbx, vby){
    var ns = Math.min(6, Math.max(1, this.s * factor)), k = ns / this.s;
    this.tx = vbx - (vbx - this.tx) * k;
    this.ty = vby - (vby - this.ty) * k;
    this.s = ns; this.clamp(); this.apply();
  };
  Diagram.prototype.zoomBy = function(f){ this.zoomAt(f, this.W/2, this.H/2); };
  Diagram.prototype.animateTo = function(s, tx, ty){
    var self = this, s0 = this.s, x0 = this.tx, y0 = this.ty, t0 = performance.now(), D = 260;
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    function step(now){
      var k = reduce ? 1 : Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
      self.s = s0 + (s - s0) * e; self.tx = x0 + (tx - x0) * e; self.ty = y0 + (ty - y0) * e;
      self.apply();
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };
  Diagram.prototype.reset = function(){ this.animateTo(1, 0, 0); };
  Diagram.prototype.focus = function(id){
    var c = this.cells[id]; if (!c) return;
    var s = Math.min(6, Math.max(2.2, this.s));
    var cx = c.x + c.w/2, cy = c.y + c.h/2;
    var tx = this.W/2 - cx * s, ty = this.H/2 - cy * s;
    var minX = this.W - this.W * s, minY = this.H - this.H * s;
    tx = Math.min(0, Math.max(minX, tx)); ty = Math.min(0, Math.max(minY, ty));
    this.animateTo(s, tx, ty);
  };
  Diagram.prototype.select = function(id, center){
    var prev = this.host.querySelector(".cell.sel");
    if (prev) prev.classList.remove("sel");
    var c = this.cells[id];
    if (c){ c.g.classList.add("sel"); if (center) this.focus(id); }
    this.selected = id;
  };
  Diagram.prototype.setMarks = function(marks){
    var colors = { revisado:"var(--accent)", correcto:"var(--ok)", danado:"var(--warn)", pendiente:"var(--pend)" };
    for (var id in this.cells){
      var dot = this.cells[id].g.querySelector(".mark-dot");
      var m = marks[id];
      dot.setAttribute("fill", m ? colors[m] : "transparent");
      dot.setAttribute("stroke", m ? "#fff" : "none");
    }
  };

  Diagram.prototype.bind = function(){
    var self = this, host = this.host, pts = {}, start = null, pinch = null;
    function count(){ return Object.keys(pts).length; }
    host.addEventListener("pointerdown", function(e){
      pts[e.pointerId] = { x:e.clientX, y:e.clientY };
      if (count() === 1){
        start = { x:e.clientX, y:e.clientY, t:Date.now(), tx:self.tx, ty:self.ty, moved:false, target:e.target };
      } else if (count() === 2){
        var p = Object.values(pts);
        pinch = { d: Math.hypot(p[0].x-p[1].x, p[0].y-p[1].y), s:self.s };
        if (start) start.moved = true;
      }
    });
    host.addEventListener("pointermove", function(e){
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x:e.clientX, y:e.clientY };
      if (count() === 2 && pinch){
        var p = Object.values(pts);
        var d = Math.hypot(p[0].x-p[1].x, p[0].y-p[1].y);
        var mid = self.toVB((p[0].x+p[1].x)/2, (p[0].y+p[1].y)/2);
        // zoomAt trabaja en coordenadas del viewBox (no del grupo interno)
        self.zoomAt((pinch.s * d / pinch.d) / self.s, mid.x, mid.y);
      } else if (count() === 1 && start){
        var dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.abs(dx) + Math.abs(dy) > 8) start.moved = true;
        if (start.moved && self.s > 1){
          var k = self.scaleRoot();
          self.tx = start.tx + dx / k; self.ty = start.ty + dy / k;
          self.clamp(); self.apply();
          host.classList.add("dragging");
        }
      }
    });
    function end(e){
      var was = pts[e.pointerId]; delete pts[e.pointerId];
      host.classList.remove("dragging");
      if (count() < 2) pinch = null;
      if (was && count() === 0 && start && !start.moved && Date.now() - start.t < 600){
        var cell = start.target && start.target.closest ? start.target.closest(".cell") : null;
        if (cell && self.opts.onSelect) self.opts.onSelect(cell.getAttribute("data-id"));
      }
      if (count() === 0) start = null;
      else { var p = Object.values(pts)[0]; start = { x:p.x, y:p.y, t:0, tx:self.tx, ty:self.ty, moved:true }; }
    }
    host.addEventListener("pointerup", end);
    host.addEventListener("pointercancel", end);
    host.addEventListener("wheel", function(e){
      e.preventDefault();
      var p = self.toVB(e.clientX, e.clientY);
      self.zoomAt(e.deltaY < 0 ? 1.18 : 1/1.18, p.x, p.y);
    }, { passive:false });
    host.addEventListener("keydown", function(e){
      var cell = e.target.closest && e.target.closest(".cell");
      if (cell && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); self.opts.onSelect && self.opts.onSelect(cell.getAttribute("data-id")); }
    });
    host.addEventListener("dblclick", function(e){
      var p = self.toVB(e.clientX, e.clientY); self.zoomAt(1.8, p.x, p.y);
    });
  };

  window.Diagram = Diagram;
})();
