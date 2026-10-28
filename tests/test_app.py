"""Pruebas automatizadas (Playwright + Chromium, emulación Pixel 7).
Uso: python3 tests/test_app.py  (desde la carpeta del proyecto)
Levanta un servidor local en http://localhost:8765 (contexto seguro para Service Worker)."""
import json, os, sys, threading, http.server, socketserver, functools, time, traceback
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8765
SHOTS = os.path.join(os.environ.get("SHOTS_DIR", "/tmp"), "focus2014_shots")
os.makedirs(SHOTS, exist_ok=True)
results = []

def ok(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (" — " + detail if detail else ""))

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
def serve():
    h = functools.partial(Q, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

# Valores de control tomados del manual oficial v.3 (págs. impresas 225–232), independientes del generador
SPOT = {
 "M-F7":("40A","Anti-lock brake system/Electronic stability program pump"),
 "M-F13":("30A","Starter relay"), "M-F18":("20A","Front wiper motor"), "M-F20":("15A","Horn"),
 "M-F27":("15A","Air conditioning clutch"), "M-F33":("15A","Ignition coils"), "M-F46":("25A","Power windows front (without door control unit)"),
 "M-F47":("7.5A","Heated mirror (without door control unit)"), "M-F11":("30A","Not used (spare)"),
 "P-F56":("20A","Fuel pump supply, Mass air flow sensor"), "P-F59":("5A","Passive anti-theft transceiver"),
 "P-F61":("20A","Cigar lighter, Power point"), "P-F74":("15A","Low beam headlamp supply"), "P-F79":("15A","Radio, Navigation DVD player, Hazard light switch, Door lock switch"),
 "P-F81":("5A","Radio frequency receiver"), "P-F86":("10A","Air bag module, Occupant classification system, Passenger air bag deactivation indicator"),
 "P-F88":("25A","Supply for F67, F69, F71 and F79"),
 "C-F2":("10A","Keyless vehicle module"), "C-F10":("25A","Audio amplifier"), "C-F34":("15A","Driver seat heater"), "C-F35":("15A","Passenger seat heater"),
}
UNUSED = ["M-F16","M-F17","M-F24","M-F29","M-F31","M-F37","M-F44","M-F45","M-F48","M-R1","M-R3","M-R4","M-R6","M-R7","M-R9",
          "P-F57","P-F58","P-F64","P-F68","P-F87","P-F89","C-F8","C-F11","C-F33","C-F36","C-F46","C-R2","C-R6"]
RELAYS = {"M-R2":"Horn","M-R5":"Rear wiper","M-R8":"Delayed accessory relay KL15","M-R10":"Starter relay","M-R11":"Air conditioning clutch",
          "M-R12":"Cooling fan","M-R13":"Heater blower","M-R14":"Engine control relay","M-R15":"Heated rear window","M-R16":"Ignition 15","C-R1":"Rear 15 relay (2/88)"}

def data_tests():
    db = json.load(open(os.path.join(ROOT, "data/fuses.json"), encoding="utf-8"))
    by = {r["id"]: r for r in db["registros"]}
    ok("14a Datos: IDs únicos", len(by) == len(db["registros"]), f"{len(by)} registros")
    bad = [k for k,(a,f) in SPOT.items() if by.get(k,{}).get("amperaje") != a or by.get(k,{}).get("funcion_en") != f]
    ok("14b Datos: amperajes y funciones de control coinciden con el manual", not bad, ",".join(bad))
    bad = [k for k in UNUSED if by.get(k,{}).get("estado") != "sin-uso"]
    ok("14c Datos: posiciones sin uso marcadas", not bad, ",".join(bad))
    bad = [k for k,f in RELAYS.items() if by.get(k,{}).get("clase") != "relevador" or by[k]["funcion_en"] != f]
    ok("14d Datos: relevadores correctos", not bad, ",".join(bad))
    nosrc = [r["id"] for r in db["registros"] if not r.get("fuente") or not r["fuente"].get("pagina")]
    ok("14e Datos: todo registro tiene fuente y página", not nosrc, ",".join(nosrc))
    act_noamp = [r["id"] for r in db["registros"] if r["clase"]=="fusible" and r["estado"]=="activo" and not r["amperaje"]]
    ok("14f Datos: todo fusible activo tiene amperaje", not act_noamp, ",".join(act_noamp))
    dg = json.load(open(os.path.join(ROOT, "data/diagnostics.json"), encoding="utf-8"))
    missing = []
    for f in dg["fallas"]:
        qids = {q["id"] for q in f["preguntas"]}
        for x in f.get("fusibles", []) + f.get("noConfundir", []):
            if x["id"] not in by: missing.append(f["id"]+":"+x["id"])
            elif by[x["id"]]["estado"] != "activo": missing.append(f["id"]+":"+x["id"]+"(no activo)")
        for q in f["preguntas"]:
            for a in ("si","no","nose"):
                nx = q[a].get("sig")
                if nx is not None and nx not in qids: missing.append(f["id"]+":sig "+str(nx))
                for h in q[a].get("agrega", []):
                    if h not in f["hipotesis"]: missing.append(f["id"]+":hip "+h)
            for c in [x for x in f.get("fusibles", []) if x.get("cuando")]:
                for h in c["cuando"]:
                    if h not in f["hipotesis"]: missing.append(f["id"]+":cuando "+h)
    ok("14g Diagnóstico: referencias a fusibles/preguntas/hipótesis válidas", not missing, "; ".join(sorted(set(missing))))
    rs = next(f for f in dg["fallas"] if f["id"] == "encendido-remoto")
    ok("14h Encendido remoto: no recomienda F13/R10 como causa (solo en 'no confundir')",
       all(x["id"] not in ("M-F13","M-R10") for x in rs["fusibles"]) and {x["id"] for x in rs["noConfundir"]} == {"M-F13","M-R10"})

def ui_tests():
    srv = serve()
    base = f"http://localhost:{PORT}/"
    with sync_playwright() as p:
        b = p.chromium.launch()
        dev = p.devices["Pixel 7"]
        ctx = b.new_context(**dev)
        pg = ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto(base); pg.wait_for_selector(".tile")
        ok("1a Inicio: seis accesos", pg.locator(".grid6 .tile").count() == 6)
        pg.screenshot(path=f"{SHOTS}/01_inicio.png")

        # Navegación
        for href, title in [("#/cajas","Diagramas"),("#/buscar","Buscar fusible"),("#/diag","Diagnóstico"),("#/fotos","Fotografías y ubicaciones"),("#/favoritos","Mis fusibles"),("#/seguridad","Guía de seguridad"),("#/fuentes","Fuentes y versión")]:
            pg.goto(base + href); pg.wait_for_timeout(150)
            ok(f"1b Navegación {href}", pg.locator("#viewTitle").inner_text() == title, pg.locator("#viewTitle").inner_text())
        pg.goto(base + "#/seguridad"); pg.wait_for_timeout(150); pg.screenshot(path=f"{SHOTS}/08_seguridad.png", full_page=True)
        pg.goto(base + "#/"); pg.wait_for_timeout(100)
        pg.click('.tile[href="#/cajas"]'); pg.wait_for_timeout(150)
        pg.click('#btnBack'); pg.wait_for_timeout(200)
        ok("1c Botón regresar", pg.locator(".grid6").count() == 1)

        # Búsqueda
        pg.goto(base + "#/buscar"); pg.wait_for_selector("#q")
        def q(term):
            pg.fill("#q", term); pg.wait_for_timeout(250)
            return pg.locator("#results .row[data-open]").all_inner_texts()
        r = q("F13"); ok("2a Buscar 'F13' → M-F13 primero", r and r[0].startswith("F13") and "arranque" in r[0], r[0][:60] if r else "")
        r = q("R10"); ok("2b Buscar 'R10' relevador de arranque", r and "arranque" in r[0].lower())
        r = q("claxon"); ok("2c Buscar 'claxon' → F20/R2", any(x.startswith("F20") for x in r) and any(x.startswith("R2") for x in r))
        r = q("horn"); ok("2d Buscar en inglés 'horn'", any(x.startswith("F20") for x in r))
        r = q("bomba de gasolina"); ok("2e 'bomba de gasolina' → F56", r and r[0].startswith("F56"), r[0][:40] if r else "")
        r = q("fuel pump"); ok("2f 'fuel pump' → F56", r and r[0].startswith("F56"))
        r = q("20A"); ok("2g Amperaje '20A' solo 20A", r and all("20A" in x for x in r), f"{len(r)} resultados")
        r = q("limpiaparabrisas"); ok("2h 'limpiaparabrisas' → F18", any(x.startswith("F18") for x in r))
        r = q("seguros"); ok("2i 'seguros' → F70", any(x.startswith("F70") for x in r))
        r = q("aire acondicionado"); ok("2j 'aire acondicionado' → F27", any(x.startswith("F27") for x in r))
        r = q("ventanas"); ok("2k 'ventanas' → F46/F14", any(x.startswith("F46") for x in r) and any(x.startswith("F14") for x in r))
        r = q("radio"); ok("2l 'radio' → F79", any(x.startswith("F79") for x in r))
        q("encendido remoto")
        ok("2m 'encendido remoto' muestra guía y aviso", pg.locator('#results a[href="#/diag/encendido-remoto"]').count() == 1 and "no documentan un fusible dedicado" in pg.locator("#results").inner_text())
        r = q("xyzqw"); ok("2n Búsqueda sin resultados", not r and "Sin resultados" in pg.locator("#results").inner_text())
        q("claxon"); pg.screenshot(path=f"{SHOTS}/03_buscar.png")
        pg.locator("#results .row[data-open]").first.click(); pg.wait_for_selector("#sheet:not([hidden])")
        ok("2o Resultado abre ficha", "Fusible F20" in pg.locator("#sheetTitle").inner_text())
        pg.click('#sheet a[href*="#/caja/M?sel=F20"]'); pg.wait_for_timeout(700)
        ok("2p 'Ver en diagrama' selecciona F20", pg.locator('.cell.sel[data-id="M-F20"]').count() == 1 and pg.locator("#sheet").is_hidden())

        # Diagrama: toque y correspondencia
        total = 0; mism = []
        for box in ["M","P","C"]:
            pg.goto(base + "#/caja/" + box); pg.wait_for_selector(".cell")
            if box == "M": pg.screenshot(path=f"{SHOTS}/02_diagrama_motor.png")
            ids = pg.eval_on_selector_all(".cell", "els => els.map(e => e.getAttribute('data-id'))")
            for cid in ids:
                pg.evaluate("id => window.__diagram.reset()", cid); pg.wait_for_timeout(0)
                pg.evaluate("id => { const d = window.__diagram; d.s=1; d.tx=0; d.ty=0; d.apply(); }", cid)
                pg.evaluate("id => document.querySelector(`.cell[data-id='${id}']`).scrollIntoView({block:'center'})", cid)
                bb = pg.locator(f'.cell[data-id="{cid}"] .body').bounding_box()
                pg.touchscreen.tap(bb["x"] + bb["width"]/2, bb["y"] + bb["height"]/2)
                try:
                    pg.wait_for_selector("#sheet:not([hidden])", timeout=1500)
                    num = cid.split("-")[1]
                    t = pg.locator("#sheetTitle").inner_text()
                    if not t.endswith(" " + num) or pg.locator("#sheet").get_attribute("data-id") != cid: mism.append(cid)
                except Exception:
                    mism.append(cid + "(sin ficha)")
                pg.evaluate("document.getElementById('sheetBackdrop').click()"); pg.wait_for_timeout(30)
                total += 1
        ok("3/4 Toque en cada celda abre su ficha correcta", not mism, f"{total} celdas probadas; errores: {mism[:8]}")

        # Zoom y desplazamiento
        pg.goto(base + "#/caja/P"); pg.wait_for_selector(".cell")
        pg.click("#zIn"); pg.click("#zIn")
        s = pg.evaluate("window.__diagram.s"); ok("5a Zoom + (botón)", s > 1.9, f"escala {s:.2f}")
        tx0 = pg.evaluate("window.__diagram.tx")
        pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(100)
        box = pg.locator("#diagWrap").bounding_box()
        cx, cy = box["x"] + box["width"]/2, box["y"] + box["height"]/2
        pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx-90, cy-30, steps=6); pg.mouse.up()
        tx1 = pg.evaluate("window.__diagram.tx"); ok("5b Desplazamiento por arrastre", abs(tx1 - tx0) > 5, f"Δtx={tx1-tx0:.1f}")
        pg.click("#zFit"); pg.wait_for_timeout(400)
        ok("5c Vista completa", abs(pg.evaluate("window.__diagram.s") - 1) < 0.01)
        pg.mouse.move(cx, cy); pg.mouse.wheel(0, -300); pg.wait_for_timeout(100)
        ok("5d Zoom con rueda", pg.evaluate("window.__diagram.s") > 1.05)
        pg.goto(base + "#/caja/C?sel=F34"); pg.wait_for_timeout(700)
        ok("5e Localizar centra y amplía", pg.evaluate("window.__diagram.s") >= 2.2 and pg.locator('.cell.sel[data-id="C-F34"]').count() == 1)
        pg.screenshot(path=f"{SHOTS}/04_localizar_cajuela.png")

        # Diagnóstico guiado: encendido remoto
        pg.goto(base + "#/diag"); pg.wait_for_selector(".row")
        pg.screenshot(path=f"{SHOTS}/05_diag_lista.png")
        pg.goto(base + "#/diag/encendido-remoto"); pg.wait_for_selector("#qText")
        pg.screenshot(path=f"{SHOTS}/06_diag_pregunta.png")
        answers = ["si","si","si","si","si","nose","no","nose","si","si"]
        for a in answers:
            pg.click(f'[data-a="{a}"]'); pg.wait_for_timeout(60)
        txt = pg.locator("#view").text_content()
        ok("6a Diagnóstico llega a resultado", "Resultado orientativo" in txt)
        ok("6b Resultado separa documentadas/hipótesis", "Condiciones documentadas por Ford" in txt and "Hipótesis por verificar" in txt)
        ok("6c Interpreta pitido + destello con el manual", "suena el claxon" in txt)
        ok("6d 'No confundir' F13/R10 y prohibición de puentear", "No confundir" in txt and "No puentee" in txt)
        ok("6e Indica cuándo acudir a técnico", "Requiere técnico" in txt)
        pg.screenshot(path=f"{SHOTS}/07_diag_resultado.png", full_page=True)
        pg.click("#qPrev"); pg.wait_for_timeout(80)
        ok("6f Cambiar última respuesta regresa a pregunta", pg.locator("#qText").count() == 1)
        pg.goto(base + "#/diag/no-arranca"); pg.wait_for_selector("#qText")
        for a in ["si","no","no","no","no"]:
            if pg.locator(f'[data-a="{a}"]').count(): pg.click(f'[data-a="{a}"]'); pg.wait_for_timeout(60)
        txt = pg.locator("#view").inner_text()
        ok("6g 'No arranca' (no gira) lista F13 y R10", "F13" in txt and "R10" in txt)
        for fid in ["radio","seguros","limpiadores","clima","luces","ventanas","claxon","accesorios"]:
            pg.goto(base + "#/diag/" + fid); pg.wait_for_selector("#qText")
            n = 0
            while pg.locator("#qText").count() and n < 12:
                pg.click('[data-a="si"]'); pg.wait_for_timeout(40); n += 1
            ok(f"6h Flujo '{fid}' termina", "Resultado orientativo" in pg.locator("#view").inner_text(), f"{n} preguntas")

        # Persistencia: favoritos, notas, marcas, historial
        pg.goto(base + "#/buscar?q=F56"); pg.wait_for_selector("#results .row[data-open]")
        pg.locator("#results .row[data-open]").first.click(); pg.wait_for_selector("#btnFav")
        pg.click("#btnFav"); pg.click('.marks button[data-m="danado"]')
        pg.fill("#noteArea", "Revisado 28/10: filamento roto"); pg.wait_for_timeout(400)
        pg.evaluate("document.getElementById('sheetBackdrop').click()")
        pg.reload(); pg.wait_for_timeout(500)
        pg.goto(base + "#/favoritos"); pg.wait_for_timeout(200)
        ok("7 Persistencia de favoritos tras recargar", "F56" in pg.locator("#view").inner_text())
        pg.goto(base + "#/favoritos?tab=hist"); pg.wait_for_timeout(200)
        ok("8a Persistencia del historial", "F56" in pg.locator("#view").inner_text())
        pg.goto(base + "#/favoritos?tab=marcas"); pg.wait_for_timeout(200)
        t = pg.locator("#view").inner_text()
        ok("8b Persistencia de marca y nota", "Dañado" in t and "filamento roto" in t)
        pg.screenshot(path=f"{SHOTS}/09_mis_fusibles.png")
        pg.goto(base + "#/caja/P"); pg.wait_for_selector(".cell")
        ok("8c Marca visible en diagrama", pg.get_attribute('.cell[data-id="P-F56"] .mark-dot', "fill") == "var(--warn)")
        raw = pg.evaluate("localStorage.getItem('focus2014:user:v1')")
        ok("8d Datos técnicos no modificados por notas", "filamento" not in json.dumps(pg.evaluate("window.__app.D.byId['P-F56']")) and "filamento" in raw)

        # Tema
        th0 = pg.evaluate("document.documentElement.dataset.theme")
        pg.click("#btnTheme"); th1 = pg.evaluate("document.documentElement.dataset.theme")
        pg.reload(); pg.wait_for_timeout(300); th2 = pg.evaluate("document.documentElement.dataset.theme")
        ok("9 Cambio claro/oscuro y persistencia", th0 != th1 and th1 == th2, f"{th0}→{th1}, tras recargar {th2}")
        pg.goto(base + "#/"); pg.wait_for_timeout(200); pg.screenshot(path=f"{SHOTS}/10_inicio_{th1}.png")
        pg.goto(base + "#/caja/M"); pg.wait_for_timeout(300); pg.screenshot(path=f"{SHOTS}/11_diagrama_{th1}.png")
        pg.click("#btnTheme")

        # Diseño en pantallas Android (sin desbordamiento horizontal)
        overflow = []
        for w, h in [(360,740),(393,851),(412,915),(800,1280)]:
            pg.set_viewport_size({"width": w, "height": h})
            for hsh in ["#/","#/caja/M","#/buscar?q=luces","#/diag/encendido-remoto","#/seguridad","#/fuentes","#/fotos"]:
                pg.goto(base + hsh); pg.wait_for_timeout(120)
                sw = pg.evaluate("document.documentElement.scrollWidth")
                if sw > w + 1: overflow.append(f"{w}:{hsh}={sw}")
        ok("10 Sin desbordamiento horizontal en 360–800 px", not overflow, ";".join(overflow))
        pg.set_viewport_size({"width": 412, "height": 915})
        small = pg.evaluate("""() => [...document.querySelectorAll('.bottomnav a, .tile, .row, .btn, .answers .btn')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && (r.height<44)}).length""")
        ok("10b Objetivos táctiles ≥ 44 px", small == 0, f"{small} elementos pequeños")

        # Manifest
        man = pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json())")
        ok("11a Manifest válido (nombre, start_url, display, iconos 192/512/maskable)",
           man["display"] == "standalone" and man["start_url"] and {"192x192","512x512"} <= {i["sizes"] for i in man["icons"]} and any(i.get("purpose") == "maskable" for i in man["icons"]))
        icons_ok = all(pg.evaluate(f"fetch('{i['src']}').then(r=>r.ok)") for i in man["icons"])
        ok("11b Iconos del manifest accesibles", icons_ok)

        # Service Worker y offline
        pg.goto(base); pg.wait_for_timeout(500)
        pg.wait_for_function("document.getElementById('offlinePill').textContent.includes('Offline listo')", timeout=15000)
        ok("12a Indicador 'Offline listo' (todos los recursos en caché)", True, pg.locator("#offlinePill").inner_text())
        ctx.set_offline(True)
        pg.reload(); pg.wait_for_selector(".tile", timeout=8000)
        pg.goto(base + "#/caja/M"); pg.wait_for_selector(".cell")
        pg.goto(base + "#/buscar?q=claxon"); pg.wait_for_timeout(300)
        r = pg.locator("#results .row[data-open]").count()
        pg.goto(base + "#/diag/encendido-remoto"); pg.wait_for_selector("#qText")
        ok("12b Sin conexión: inicio, diagrama, búsqueda y diagnóstico funcionan", r > 0)
        ctx.set_offline(False)
        ok("Consola sin errores JS", not [e for e in errors if "favicon" not in e], "; ".join(errors[:5]))
        ctx.close()

        # Recursos faltantes: sin fotos, y datos inaccesibles
        ctx2 = b.new_context(**dev); pg2 = ctx2.new_page()
        pg2.goto(base + "#/fotos"); pg2.wait_for_selector(".photo-slot")
        ok("13a Fotos faltantes muestran 'Pendiente' sin romper la app", pg2.locator(".photo-slot .badge").count() == 15)
        pg2.screenshot(path=f"{SHOTS}/12_fotos.png")
        pg2.set_input_files('.photos[data-box="M"] .photo-slot[data-key="M:ubicacion"] input', os.path.join(ROOT, "icons/icon-512.png"))
        pg2.wait_for_selector('.photo-slot.has', timeout=5000)
        pg2.reload(); pg2.wait_for_selector('.photo-slot.has', timeout=5000)
        ok("13b Foto del usuario se guarda y persiste (IndexedDB)", "Foto del usuario" in pg2.locator('.photo-slot.has').first.inner_text())
        ctx2.close()
        ctx3 = b.new_context(**dev); pg3 = ctx3.new_page()
        pg3.route("**/data/diagnostics.json", lambda route: route.fulfill(status=404, body="no"))
        pg3.goto(base); pg3.wait_for_timeout(800)
        ok("13c Datos faltantes: mensaje claro de error", "No se pudieron cargar los datos" in pg3.locator("#view").inner_text())
        ctx3.close()
        ctx4 = b.new_context(**dev); pg4 = ctx4.new_page()
        pg4.goto("file://" + os.path.join(ROOT, "index.html")); pg4.wait_for_timeout(800)
        ok("13d Abierto con file:// avisa que requiere HTTPS", "file://" in pg4.locator("#view").inner_text() and "Sin modo offline" in pg4.locator("#offlinePill").inner_text())
        ctx4.close()
        b.close()
    srv.shutdown()

if __name__ == "__main__":
    data_tests()
    try: ui_tests()
    except Exception as e:
        traceback.print_exc(); ok("Ejecución UI completa", False, str(e))
    p = sum(1 for r in results if r[1]); f = len(results) - p
    print(f"\nTOTAL: {p} aprobadas, {f} fallidas de {len(results)}")
    json.dump([{"prueba":n,"ok":o,"detalle":d} for n,o,d in results], open(os.path.join(SHOTS, "resultados.json"),"w"), ensure_ascii=False, indent=1)
    sys.exit(1 if f else 0)
