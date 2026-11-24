/*
 * La scena isometrica di Capomastro: il Progetto Rossi (geometria vera, scena/rossi.json, scritta dal motore con tools/sito_scena_json.py)
 * disegnato in isometrica esplosa su un canvas 2D. Il disegno è una funzione dello stato (contorni, quote, travi, struttura, moduli, circuiti,
 * collettori, centrale, regolazione, tavole, esplosione, rotazione, zoom): chi la usa (l'eroe, i moduli, i dodici passi, il menù, il
 * caricamento) cambia lo stato e la scena ci arriva con le molle, disegnando i tratti uno dopo l'altro.
 *
 *   var s = CapomastroScena.crea(canvas, dati, { tilt: true, deriva: true });
 *   s.imposta(CapomastroScena.STATI.completa);          // verso lo stato, a molla
 *   s.imposta({ tb: 0 }, true);                         // un pezzo di stato, subito
 *   s.visibile(true);                                   // il ciclo di disegno gira solo mentre la scena si vede e si muove
 *
 * Colori: i token CSS --sc-* (due temi, giorno e notte): s.tavolozza() li rilegge quando cambia il tema. Mandata rossa continua e ritorno blu
 * tratteggiato come in tutto il prodotto (R-163). Niente dipendenze, nessuna rete: solo il disegno.
 */
(function () {
  "use strict";
  var DEG = Math.PI / 180;
  var ZL = { st: 1.5, md: 3.0, tb: 3.16, co: 4.5, ce: 4.5, rg: 5.8, tv: 7.4 };  // quote dei livelli esplosi (m)
  var Z_QUOTA = 2.6;  // la quota di posa del progetto d'esempio (D1)

  // stati: ogni pezzo va da 0 (assente) a 1 (disegnato). c contorni, qt quota di posa, tr travi, nr zone senza moduli, st struttura, md moduli,
  // tb circuiti, co collettori, ce centrale, rg regolazione, tv tavole, et etichette dei numeri, ex esplosione dei livelli
  var VUOTA = { c: 0, qt: 0, tr: 0, nr: 0, st: 0, md: 0, tb: 0, co: 0, ce: 0, rg: 0, tv: 0, et: 0, ex: 0, yaw: 45, pit: 35, zm: 1, px: 0, py: 0 };
  function stato(o) { var s = {}, k; for (k in VUOTA) s[k] = VUOTA[k]; for (k in o) s[k] = o[k]; return s; }
  var STATI = {
    vuota: stato({}),
    contorni: stato({ c: 1, yaw: 40 }),
    completa: stato({ c: 1, st: 1, md: 1, tb: 1, co: 1, ce: 1, rg: 1, tv: 0.9, ex: 1, yaw: 42, pit: 34, zm: 1 }),
    moduli: stato({ c: 1, st: 1, md: 1, tb: 1, co: 1, ex: 0.55, yaw: 44, pit: 36, zm: 1.04 }),
    // i dodici passi del percorso
    passi: [
      stato({ c: 1, tr: 0.35, yaw: 36, pit: 38 }),                                                   // 1 Lettura
      stato({ c: 1, qt: 1, tr: 0.25, yaw: 40, pit: 33, zm: 0.96 }),                                  // 2 D1 quota
      stato({ c: 1, tr: 1, yaw: 48, pit: 40 }),                                                      // 3 D2 travi e scavalchi
      stato({ c: 1, tr: 0.3, nr: 1, yaw: 44, pit: 42 }),                                             // 4 D3 NO RADIUS
      stato({ c: 1, st: 1, md: 1, ex: 0.55, yaw: 44, pit: 36, zm: 1.02 }),                           // 5 Pannelli
      stato({ c: 1, st: 1, md: 1, tb: 1, co: 1, ex: 0.62, yaw: 46, pit: 36, zm: 1.06 }),             // 6 D4 circuiti e collettori
      stato({ c: 1, st: 1, md: 1, tb: 1, co: 1, ce: 1, ex: 0.85, yaw: 42, pit: 34, zm: 0.98 }),      // 7 D5 centrale
      stato({ c: 1, st: 1, md: 1, tb: 1, co: 1, ce: 1, rg: 1, ex: 0.95, yaw: 40, pit: 33, zm: 0.94 }),  // 8 D6 regolazione
      stato({ c: 1, st: 1, md: 1, tb: 1, co: 1, ce: 1, rg: 1, et: 1, ex: 1, yaw: 38, pit: 33, zm: 0.94 }),  // 9 D7 prezzi
      stato({ c: 1, st: 1, md: 1, tb: 1, co: 1, ce: 1, rg: 1, tv: 0.55, ex: 1, yaw: 40, pit: 33, zm: 0.9 }),  // 10 D8 documento
      stato({ c: 1, st: 1, md: 1, tb: 1, co: 1, ce: 1, rg: 1, et: 1, tv: 0.6, ex: 1, yaw: 46, pit: 34, zm: 0.9 }),  // 11 Anteprima
      stato({ c: 1, st: 1, md: 1, tb: 1, co: 1, ce: 1, rg: 1, tv: 1, ex: 1, yaw: 42, pit: 31, zm: 0.86 })   // 12 Genera
    ]
  };
  var RIGIDITA = { c: 46, qt: 52, tr: 60, nr: 60, st: 34, md: 30, tb: 22, co: 70, ce: 50, rg: 44, tv: 36, et: 60, ex: 38, yaw: 30, pit: 30, zm: 40, px: 40, py: 40 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function prog(p, i, n, span) {  // il pezzo i di n compare uno dopo l'altro mentre p va da 0 a 1
    var t = n > 1 ? (i / n) * (1 - span) : 0;
    return clamp((p - t) / span, 0, 1);
  }
  function usc(t) { return 1 - Math.pow(1 - t, 3); }

  function lunghezze(pts, chiuso) {
    var cum = [0], tot = 0, n = pts.length, i, a, b;
    for (i = 1; i < n + (chiuso ? 1 : 0); i++) {
      a = pts[i - 1]; b = pts[i % n];
      tot += Math.hypot(b[0] - a[0], b[1] - a[1]);
      cum.push(tot);
    }
    return { pts: chiuso ? pts.concat([pts[0]]) : pts, cum: cum, tot: tot };
  }

  function prepara(D) {
    var d = { D: D, w: D.w, h: D.h, cx: D.w / 2, cy: D.h / 2 }, i;
    d.locali = D.locali.map(function (l) {
      return { n: l.n, a: l.a, e: l.e, anelli: l.p.map(function (r) { return lunghezze(r, true); }), ext: l.p[0] };
    });
    d.travi = D.travi.map(function (t) { return { id: t.id, h: t.h, anello: lunghezze(t.p[0], true), p: t.p[0] }; });
    function segmenti(lista) {
      return lista.map(function (s) { return { a: s[0], b: s[1], L: Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) }; })
        .sort(function (u, v) { return (u.a[0] + u.a[1]) - (v.a[0] + v.a[1]); });
    }
    d.portanti = segmenti(D.portanti); d.secondari = segmenti(D.secondari); d.perimetrali = segmenti(D.perimetrali);
    var ordine = D.moduli.slice().sort(function (u, v) { return u.c - v.c || u.j - v.j; });
    d.moduli = ordine.map(function (m, k) { return { x0: m.r[0], y0: m.r[1], x1: m.r[2], y1: m.r[3], t: m.t, c: m.c, i: k, cx: (m.r[0] + m.r[2]) / 2, cy: (m.r[1] + m.r[3]) / 2 }; });
    d.circuiti = D.circuiti.map(function (c) { return { k: c.k, man: c.m.map(function (p) { return lunghezze(p, false); }), rit: c.r.map(function (p) { return lunghezze(p, false); }) }; });
    d.collettori = D.collettori;
    d.centrale = D.centrale ? { tappe: D.centrale.tappe, linea: D.centrale.linea.map(function (p) { return lunghezze(p, false); }) } : null;
    d.reg = D.regolazione;
    d.regBus = (D.regolazione.bus || []).map(function (p) { return lunghezze(p, false); });
    if (D.regolazione.bus_display && D.regolazione.bus_display.length > 1) d.regBus.push(lunghezze(D.regolazione.bus_display, false));
    // i locali senza nessun modulo (NO RADIUS: il ripostiglio dei collettori): per l'evidenza del passo D3
    function dentro(x, y, r) {
      var c = false, j = r.length - 1, k;
      for (k = 0; k < r.length; k++) { if ((r[k][1] > y) !== (r[j][1] > y) && x < ((r[j][0] - r[k][0]) * (y - r[k][1])) / (r[j][1] - r[k][1]) + r[k][0]) c = !c; j = k; }
      return c;
    }
    d.locali.forEach(function (l) { l.senza = !d.moduli.some(function (m) { return dentro(m.cx, m.cy, l.ext); }); });
    d.nModuli = d.moduli.length;
    d.nCavi = 0; for (i = 0; i < d.circuiti.length; i++) d.nCavi++;
    return d;
  }

  function leggiTavolozza() {
    var cs = getComputedStyle(document.documentElement);
    function g(n, d) { var v = cs.getPropertyValue(n); return v && v.trim() ? v.trim() : d; }
    return {
      linea: g("--sc-linea", "#1c3d7d"), stanza: g("--sc-stanza", "rgba(47,107,255,.07)"), struttura: g("--sc-struttura", "#6b86b8"),
      m240: g("--sc-m240", "#3b82f6"), m120: g("--sc-m120", "#f59e0b"), m86: g("--sc-m86", "#10b981"), lato: g("--sc-lato", "rgba(8,20,48,.35)"),
      mandata: g("--sc-mandata", "#e5484d"), ritorno: g("--sc-ritorno", "#2f6bff"), coll: g("--sc-coll", "#0b1628"), collTop: g("--sc-coll-top", "#ffffff"),
      primaria: g("--sc-primaria", "#ea7b2c"), reg: g("--sc-reg", "#0ea5c9"), testo: g("--sc-testo", "#0b1628"), tavola: g("--sc-tavola", "#ffffff"),
      tavolaLinea: g("--sc-tavola-linea", "#1c3d7d"), trave: g("--sc-trave", "#c2410c"), accento: g("--sc-accento", "#2f6bff"),
      alone: g("--sc-alone", "0"), griglia: g("--sc-griglia", "rgba(28,61,125,.16)"), font: g("--font", "Inter, system-ui, sans-serif")
    };
  }

  function crea(canvas, D, opz) {
    opz = opz || {};
    var ctx = canvas.getContext("2d"), d = prepara(D), pal = leggiTavolozza();
    var A = stato({}), P = stato({}), V = {}, k;
    for (k in P) V[k] = 0;
    var W = 0, H = 0, dpr = 1, visibile = false, raf = 0, ultimo = 0, t0 = 0, tempo = 0;
    var tx = 0, ty = 0, tiltX = 0, tiltY = 0, tiltVX = 0, tiltVY = 0, interagisce = false;
    var base = { yaw: 45, pit: 35 };
    var quieto = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var proiez = { cY: 0, sY: 0, cP: 0, sP: 0, sc: 1, ox: 0, oy: 0 };

    // ---- proiezione ortografica: rotazione attorno al centro della pianta (yaw), inclinazione (pit), quota z in metri --------------
    function imp() {
      var yaw = (P.yaw + tiltX) * DEG, pit = clamp(P.pit + tiltY, 8, 80) * DEG, pr = proiez;
      pr.cY = Math.cos(yaw); pr.sY = Math.sin(yaw); pr.cP = Math.cos(pit); pr.sP = Math.sin(pit);
      var zt = 0.8 + (P.qt > 0.02 ? Z_QUOTA * P.qt * (1 - 0.55 * P.ex) : 0), minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, i, X, Y, z, kk;
      for (kk in ZL) zt = Math.max(zt, ZL[kk] * P.ex * clamp(P[kk] * 2, 0, 1) + 0.8);
      var cs = [[0, 0], [d.w, 0], [d.w, d.h], [d.w, d.h], [0, d.h]];
      for (i = 0; i < cs.length; i++) {
        for (z = 0; z <= 1; z++) {
          var dx = cs[i][0] - d.cx, dy = cs[i][1] - d.cy;
          X = dx * pr.cY - dy * pr.sY; Y = (dx * pr.sY + dy * pr.cY) * pr.sP - (z ? zt : 0) * pr.cP;
          if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y;
        }
      }
      var m = W < 520 ? 0.94 : 0.9, sc = Math.min((W * m) / (maxX - minX), (H * m) / (maxY - minY)) * P.zm;
      pr.sc = sc;
      pr.ox = W / 2 - ((minX + maxX) / 2) * sc - P.px * W;
      pr.oy = H / 2 - ((minY + maxY) / 2) * sc - P.py * H;
    }
    var _x = 0, _y = 0;
    function pj(x, y, z) {  // → _x, _y in pixel CSS
      var pr = proiez, dx = x - d.cx, dy = y - d.cy, X = dx * pr.cY - dy * pr.sY, Y = dx * pr.sY + dy * pr.cY;
      _x = pr.ox + X * pr.sc; _y = pr.oy + (Y * pr.sP - z * pr.cP) * pr.sc;
    }
    function zl(chiave) { return ZL[chiave] * P.ex + 0.02 * (chiave === "tb" ? 1 : 0); }

    // ---- primitive ------------------------------------------------------------------------------------------------------------
    function polilinea(pl, z, f) {  // un tratto di polilinea (con le lunghezze cumulate) fino alla frazione f
      var pts = pl.pts, cum = pl.cum, tot = pl.tot * f, i, a, b, t;
      pj(pts[0][0], pts[0][1], z); ctx.moveTo(_x, _y);
      for (i = 1; i < pts.length; i++) {
        if (cum[i] <= tot + 1e-9) { pj(pts[i][0], pts[i][1], z); ctx.lineTo(_x, _y); continue; }
        a = pts[i - 1]; b = pts[i]; t = (tot - cum[i - 1]) / (cum[i] - cum[i - 1]);
        if (t > 0) { pj(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z); ctx.lineTo(_x, _y); }
        break;
      }
    }
    function quad(x0, y0, x1, y1, z) { pj(x0, y0, z); ctx.moveTo(_x, _y); pj(x1, y0, z); ctx.lineTo(_x, _y); pj(x1, y1, z); ctx.lineTo(_x, _y); pj(x0, y1, z); ctx.lineTo(_x, _y); ctx.closePath(); }
    function scatola(x0, y0, x1, y1, z0, alt, colTop, colLato, alpha) {  // parallelepipedo: le sole facce che si vedono
      var pr = proiez, lati = [[x0, y0, x1, y0, 0, -1], [x1, y0, x1, y1, 1, 0], [x1, y1, x0, y1, 0, 1], [x0, y1, x0, y0, -1, 0]], i, L, ny;
      ctx.globalAlpha = alpha; ctx.fillStyle = colLato;
      for (i = 0; i < 4; i++) {
        L = lati[i]; ny = L[4] * pr.sY + L[5] * pr.cY;
        if (ny <= 0.001) continue;
        ctx.beginPath();
        pj(L[0], L[1], z0 + alt); ctx.moveTo(_x, _y); pj(L[2], L[3], z0 + alt); ctx.lineTo(_x, _y);
        pj(L[2], L[3], z0); ctx.lineTo(_x, _y); pj(L[0], L[1], z0); ctx.lineTo(_x, _y); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = colTop; ctx.beginPath(); quad(x0, y0, x1, y1, z0 + alt); ctx.fill();
    }
    function testo(s, x, y, px, col, peso, centro) {
      ctx.font = (peso || 600) + " " + px + "px " + pal.font; ctx.fillStyle = col; ctx.textAlign = centro ? "center" : "left"; ctx.textBaseline = "middle";
      ctx.fillText(s, x, y);
    }
    function ellisse(x, y, z, r) { pj(x, y, z); ctx.ellipse(_x, _y, r * proiez.sc, r * proiez.sc * proiez.sP, 0, 0, Math.PI * 2); }
    function lw(v) { return Math.max(0.6, v * clamp(proiez.sc / 36, 0.7, 1.7)); }

    // ---- livelli ------------------------------------------------------------------------------------------------------------
    function griglia() {
      var a = P.c; if (a < 0.02) return;
      ctx.save(); ctx.globalAlpha = 0.55 * a * (1 - 0.6 * P.ex); ctx.strokeStyle = pal.griglia; ctx.lineWidth = 0.6; ctx.beginPath();
      var x, y, m = 1.2;
      for (x = -m; x <= d.w + m + 0.01; x += 1) { pj(x, -m, 0); ctx.moveTo(_x, _y); pj(x, d.h + m, 0); ctx.lineTo(_x, _y); }
      for (y = -m; y <= d.h + m + 0.01; y += 1) { pj(-m, y, 0); ctx.moveTo(_x, _y); pj(d.w + m, y, 0); ctx.lineTo(_x, _y); }
      ctx.stroke(); ctx.restore();
    }
    function contorni() {
      var a = P.c; if (a < 0.01) return;
      ctx.save();
      d.locali.forEach(function (l, i) {
        var f = usc(prog(a, i, d.locali.length, 0.5));
        if (f <= 0) return;
        // riempimento del locale, e l'evidenza «senza moduli» del passo D3 (tratteggio)
        ctx.globalAlpha = f * 0.9; ctx.fillStyle = pal.stanza; ctx.beginPath();
        l.anelli.forEach(function (r) { pj(r.pts[0][0], r.pts[0][1], 0); ctx.moveTo(_x, _y); r.pts.forEach(function (p) { pj(p[0], p[1], 0); ctx.lineTo(_x, _y); }); ctx.closePath(); });
        ctx.fill("evenodd");
        if (l.senza && P.nr > 0.02) {
          ctx.save(); ctx.clip(); ctx.globalAlpha = P.nr * 0.5; ctx.strokeStyle = pal.trave; ctx.lineWidth = lw(1.2); ctx.beginPath();
          var b = l.ext, mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9, t;
          b.forEach(function (p) { mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); });
          for (t = mnx - (mxy - mny); t < mxx; t += 0.22) { pj(t, mny, 0); ctx.moveTo(_x, _y); pj(t + (mxy - mny), mxy, 0); ctx.lineTo(_x, _y); }
          ctx.stroke(); ctx.restore();
          ctx.globalAlpha = 1;
        }
      });
      ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = pal.linea; ctx.lineWidth = lw(1.5);
      d.locali.forEach(function (l, i) {
        var f = prog(a, i, d.locali.length, 0.5);
        if (f <= 0) return;
        ctx.globalAlpha = Math.min(1, f * 3) * 0.95; ctx.beginPath();
        l.anelli.forEach(function (r) { polilinea(r, 0, f); });
        ctx.stroke();
      });
      ctx.restore();
    }
    function travi() {
      var a = P.tr; if (a < 0.02) return;
      ctx.save();
      d.travi.forEach(function (t, i) {
        var f = prog(a, i, d.travi.length, 0.55), p = t.p;
        if (f <= 0) return;
        var xs = p.map(function (q) { return q[0]; }), ys = p.map(function (q) { return q[1]; });
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
        var alt = 0.34 * usc(f);
        scatola(x0, y0, x1, y1, 0.0, alt, pal.trave, pal.lato, 0.85 * f);
        if (P.tr > 0.7) {  // lo scavalco: l'arco del tubo che passa sopra la trave, nel punto mediano
          var mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ci;
          ctx.globalAlpha = 0.95 * f; ctx.strokeStyle = pal.mandata; ctx.lineWidth = lw(2); ctx.beginPath();
          for (ci = 0; ci <= 12; ci++) { var u = ci / 12; pj(mx + (u - 0.5) * 1.1 * (x1 - x0 > y1 - y0 ? 0 : 1), my + (u - 0.5) * 1.1 * (x1 - x0 > y1 - y0 ? 1 : 0), 0.06 + Math.sin(u * Math.PI) * (alt + 0.18)); ci ? ctx.lineTo(_x, _y) : ctx.moveTo(_x, _y); }
          ctx.stroke();
        }
        if (P.tr > 0.7 && f > 0.9) {
          pj((x0 + x1) / 2, y0, alt + 0.1);
          testo(t.id, _x, _y - 10, 11 * clamp(proiez.sc / 34, 0.8, 1.2), pal.trave, 700, true);
        }
      });
      ctx.restore();
    }
    function quota() {
      var a = P.qt; if (a < 0.02) return;
      var z = Z_QUOTA * (1 - 0.55 * P.ex), f = usc(a), x1 = d.w - 0.45, y1 = d.h - 0.4;
      ctx.save(); ctx.globalAlpha = 0.8 * f; ctx.strokeStyle = pal.accento; ctx.lineWidth = lw(1.2); ctx.setLineDash([5, 4]);
      ctx.beginPath(); quad(0.45, 0.45, x1, y1, z * f); ctx.stroke();      // il controsoffitto alla quota di posa
      ctx.beginPath(); [[0.45, 0.45], [x1, 0.45], [x1, y1], [0.45, y1]].forEach(function (c) { pj(c[0], c[1], 0); ctx.moveTo(_x, _y); pj(c[0], c[1], z * f); ctx.lineTo(_x, _y); }); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.07 * f; ctx.fillStyle = pal.accento; ctx.beginPath(); quad(0.45, 0.45, x1, y1, z * f); ctx.fill();
      // la quota: freccia verticale con il valore
      ctx.globalAlpha = f; ctx.strokeStyle = pal.testo; ctx.lineWidth = lw(1.4); ctx.beginPath();
      pj(x1 + 0.3, y1 + 0.3, 0); ctx.moveTo(_x, _y); var bx = _x, by = _y; pj(x1 + 0.3, y1 + 0.3, z * f); ctx.lineTo(_x, _y);
      ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by); ctx.moveTo(_x - 5, _y); ctx.lineTo(_x + 5, _y); ctx.stroke();
      var px = clamp(proiez.sc / 34, 0.85, 1.3) * 13;
      testo("2,60 m", _x + 9, (by + _y) / 2, px, pal.testo, 700, false);
      ctx.restore();
    }
    function struttura() {
      var a = P.st; if (a < 0.01) return;
      var z = zl("st"); ctx.save(); ctx.lineCap = "butt"; ctx.strokeStyle = pal.struttura;
      function serie(lista, spessore, alfa, ritardo) {
        ctx.lineWidth = lw(spessore); ctx.beginPath();
        var n = lista.length;
        lista.forEach(function (s, i) {
          var f = usc(prog(clamp((a - ritardo) / (1 - ritardo), 0, 1), i, n, 0.4));
          if (f <= 0) return;
          pj(s.a[0], s.a[1], z); ctx.moveTo(_x, _y); pj(s.a[0] + (s.b[0] - s.a[0]) * f, s.a[1] + (s.b[1] - s.a[1]) * f, z); ctx.lineTo(_x, _y);
        });
        ctx.globalAlpha = alfa * Math.min(1, a * 3); ctx.stroke();
      }
      serie(d.perimetrali, 1.7, 0.9, 0);
      serie(d.portanti, 1.15, 0.85, 0.12);
      serie(d.secondari, 0.8, 0.6, 0.3);
      ctx.restore();
    }
    function moduli() {
      var a = P.md; if (a < 0.01) return;
      var z0 = zl("md"), n = d.nModuli, notte = pal.alone === "1", lista = d.moduli;
      ctx.save();
      // dal fondo verso il davanti: le facce laterali si coprono giuste
      var pr = proiez, ord = lista.map(function (m) { return { m: m, k: (m.cx - d.cx) * pr.sY + (m.cy - d.cy) * pr.cY }; }).sort(function (u, v) { return u.k - v.k; });
      ord.forEach(function (o) {
        var m = o.m, f = usc(prog(a, m.i, n, 0.34));
        if (f <= 0.001) return;
        var col = m.t === 240 ? pal.m240 : m.t === 120 ? pal.m120 : pal.m86, alt = 0.07, zz = z0 + (1 - f) * 0.9;
        var g = 0.04;  // la fessura fra due moduli
        if (notte) {
          ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.3 * f; ctx.fillStyle = col; ctx.beginPath(); quad(m.x0 - 0.16, m.y0 - 0.16, m.x1 + 0.16, m.y1 + 0.16, zz + alt); ctx.fill(); ctx.globalAlpha = 0.12 * f; ctx.beginPath(); quad(m.x0 - 0.34, m.y0 - 0.34, m.x1 + 0.34, m.y1 + 0.34, zz + alt); ctx.fill(); ctx.restore();
        }
        scatola(m.x0 + g, m.y0 + g, m.x1 - g, m.y1 - g, zz, alt, col, pal.lato, f);
        // le due righe del serpentino sul modulo
        ctx.globalAlpha = 0.28 * f; ctx.strokeStyle = "#fff"; ctx.lineWidth = lw(0.8); ctx.beginPath();
        var horiz = (m.x1 - m.x0) > (m.y1 - m.y0), e = 0.09;
        if (horiz) { pj(m.x0 + 0.1, m.y0 + e, zz + alt); ctx.moveTo(_x, _y); pj(m.x1 - 0.1, m.y0 + e, zz + alt); ctx.lineTo(_x, _y); pj(m.x0 + 0.1, m.y1 - e, zz + alt); ctx.moveTo(_x, _y); pj(m.x1 - 0.1, m.y1 - e, zz + alt); ctx.lineTo(_x, _y); }
        else { pj(m.x0 + e, m.y0 + 0.1, zz + alt); ctx.moveTo(_x, _y); pj(m.x0 + e, m.y1 - 0.1, zz + alt); ctx.lineTo(_x, _y); pj(m.x1 - e, m.y0 + 0.1, zz + alt); ctx.moveTo(_x, _y); pj(m.x1 - e, m.y1 - 0.1, zz + alt); ctx.lineTo(_x, _y); }
        ctx.stroke();
      });
      ctx.restore();
    }
    function circuiti() {
      var a = P.tb; if (a < 0.01) return;
      var z = zl("tb") + 0.07 * (1 - P.ex) + 0.05, n = d.circuiti.length;
      ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
      d.circuiti.forEach(function (c, i) {
        var f = usc(prog(a, i, n, 0.5));
        if (f <= 0) return;
        ctx.globalAlpha = Math.min(1, f * 4);
        // il ritorno: blu a tratteggio piccolo (R-163) o, nel nuovo stile dei tubi (d.continuo), blu pieno; la mandata: rossa continua
        ctx.strokeStyle = pal.ritorno; ctx.lineWidth = lw(1.5); ctx.setLineDash(d.continuo ? [] : [lw(3.2), lw(2.6)]); ctx.beginPath();
        c.rit.forEach(function (pl) { polilinea(pl, z, f); });
        ctx.stroke();
        ctx.setLineDash([]); ctx.strokeStyle = pal.mandata; ctx.lineWidth = lw(2); ctx.beginPath();
        c.man.forEach(function (pl) { polilinea(pl, z, f); });
        ctx.stroke();
      });
      // la luce che scorre lungo la mandata (solo a scena visibile e con movimento)
      if (!quieto && opz.luce !== false && a > 0.98) {
        ctx.globalAlpha = 0.95; ctx.fillStyle = "#fff";
        d.circuiti.forEach(function (c, i) {
          var pl = c.man[0]; if (!pl) return;
          var u = ((tempo * 0.16 + i * 0.137) % 1) * pl.tot, j, s0, t;
          for (j = 1; j < pl.pts.length; j++) if (pl.cum[j] >= u) { s0 = pl.pts[j - 1]; t = (u - pl.cum[j - 1]) / Math.max(1e-6, pl.cum[j] - pl.cum[j - 1]); pj(s0[0] + (pl.pts[j][0] - s0[0]) * t, s0[1] + (pl.pts[j][1] - s0[1]) * t, z); ctx.beginPath(); ctx.arc(_x, _y, lw(2.2), 0, 6.3); ctx.fill(); break; }
        });
      }
      ctx.restore();
    }
    function collettori() {
      var a = P.co; if (a < 0.01) return;
      var z = zl("co");
      ctx.save();
      d.collettori.forEach(function (c, i) {
        var f = usc(prog(a, i, d.collettori.length, 0.6)); if (f <= 0 || !c.r) return;
        var r = c.r, cxm = (r[0] + r[2]) / 2, cym = (r[1] + r[3]) / 2, hx = (r[2] - r[0]) / 2 * 1.6, hy = (r[3] - r[1]) / 2 * 1.6;
        // il piedino che lo lega al suo livello e il corpo
        scatola(cxm - hx, cym - hy, cxm + hx, cym + hy, z, 0.34 * f, pal.collTop, pal.coll, f);
        ctx.globalAlpha = f; ctx.strokeStyle = pal.mandata; ctx.lineWidth = lw(2); ctx.beginPath(); pj(cxm - hx, cym - hy * 0.4, z + 0.34 * f); ctx.moveTo(_x, _y); pj(cxm + hx, cym - hy * 0.4, z + 0.34 * f); ctx.lineTo(_x, _y); ctx.stroke();
        ctx.strokeStyle = pal.ritorno; ctx.beginPath(); pj(cxm - hx, cym + hy * 0.4, z + 0.34 * f); ctx.moveTo(_x, _y); pj(cxm + hx, cym + hy * 0.4, z + 0.34 * f); ctx.lineTo(_x, _y); ctx.stroke();
        pj(cxm + (c.i ? -0.55 : 0.55), cym + (c.i ? -0.25 : 0.25), z + 0.34 * f + 0.3);
        testo("C" + (c.i + 1), _x, _y, 12 * clamp(proiez.sc / 34, 0.85, 1.25), pal.testo, 800, true);
      });
      ctx.restore();
    }
    function centrale() {
      var a = P.ce; if (a < 0.01 || !d.centrale) return;
      var z = zl("ce"), T = d.centrale.tappe, f;
      ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
      // la linea primaria dal gruppo ai collettori
      var n = d.centrale.linea.length;
      d.centrale.linea.forEach(function (pl, i) {
        f = usc(prog(clamp((a - 0.25) / 0.75, 0, 1), i, n, 0.5)); if (f <= 0) return;
        ctx.globalAlpha = Math.min(1, f * 4); ctx.strokeStyle = pal.primaria; ctx.lineWidth = lw(3.6); ctx.beginPath(); polilinea(pl, z + 0.06, f); ctx.stroke();
        ctx.strokeStyle = pal.ritorno; ctx.lineWidth = lw(1.2); ctx.setLineDash([lw(2.4), lw(2)]); ctx.beginPath(); polilinea(pl, z + 0.06, f); ctx.stroke(); ctx.setLineDash([]);
      });
      f = usc(clamp(a * 1.6, 0, 1));
      if (T.pdc) {  // pompa di calore: un parallelepipedo con la ventola
        var p = T.pdc; scatola(p[0] - 0.34, p[1] - 0.26, p[0] + 0.34, p[1] + 0.26, z, 0.62 * f, pal.collTop, pal.coll, f);
        ctx.globalAlpha = f; ctx.strokeStyle = pal.accento; ctx.lineWidth = lw(1.4); ctx.beginPath(); ellisse(p[0], p[1], z + 0.62 * f, 0.19); ctx.stroke();
        ctx.beginPath(); pj(p[0] - 0.19, p[1], z + 0.62 * f); ctx.moveTo(_x, _y); pj(p[0] + 0.19, p[1], z + 0.62 * f); ctx.lineTo(_x, _y); ctx.stroke();
      }
      if (T.accumulo) {  // accumulo: un cilindro
        var q = T.accumulo, r = 0.24, h = 0.95 * f;
        ctx.globalAlpha = f; ctx.fillStyle = pal.coll; ctx.beginPath();
        pj(q[0] - r, q[1], z); ctx.moveTo(_x, _y); pj(q[0] - r, q[1], z + h); ctx.lineTo(_x, _y); pj(q[0] + r, q[1], z + h); var ex = _x, ey = _y; pj(q[0] + r, q[1], z);
        ctx.lineTo(_x, _y); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ellisse(q[0], q[1], z, r); ctx.fill();
        ctx.fillStyle = pal.collTop; ctx.beginPath(); ellisse(q[0], q[1], z + h, r); ctx.fill();
        ctx.strokeStyle = pal.primaria; ctx.lineWidth = lw(1.6); ctx.beginPath(); ellisse(q[0], q[1], z + h, r); ctx.stroke(); void ex; void ey;
      }
      if (T.gruppo) {
        var g = T.gruppo; scatola(g[0] - 0.17, g[1] - 0.12, g[0] + 0.17, g[1] + 0.12, z, 0.42 * f, pal.collTop, pal.coll, f);
        ctx.globalAlpha = f; ctx.strokeStyle = pal.mandata; ctx.lineWidth = lw(1.6); ctx.beginPath(); ellisse(g[0], g[1], z + 0.42 * f, 0.08); ctx.stroke();
      }
      ctx.restore();
    }
    function regolazione() {
      var a = P.rg; if (a < 0.01) return;
      var z = zl("rg"), R = d.reg, f;
      ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.strokeStyle = pal.reg; ctx.lineWidth = lw(1.3); ctx.setLineDash([lw(5), lw(3)]);
      d.regBus.forEach(function (pl, i) {
        f = usc(prog(a, i, d.regBus.length, 0.55)); if (f <= 0) return;
        ctx.globalAlpha = Math.min(1, f * 4) * 0.9; ctx.beginPath(); polilinea(pl, z, f); ctx.stroke();
      });
      ctx.setLineDash([]);
      f = usc(clamp(a * 1.4, 0, 1));
      R.sonde.forEach(function (s, i) {  // le sonde a soffitto: un anello con un punto, e l'onda che si apre
        var u = usc(prog(a, i, R.sonde.length, 0.5)); if (u <= 0) return;
        ctx.globalAlpha = u; ctx.fillStyle = pal.reg; ctx.beginPath(); pj(s.xy[0], s.xy[1], z); ctx.arc(_x, _y, lw(3.4), 0, 6.3); ctx.fill();
        ctx.strokeStyle = pal.reg; ctx.lineWidth = lw(1.2); ctx.beginPath(); ctx.arc(_x, _y, lw(7), 0, 6.3); ctx.stroke();
        if (!quieto && a > 0.95 && opz.luce !== false) { var o = ((tempo * 0.5 + i * 0.21) % 1); ctx.globalAlpha = (1 - o) * 0.6; ctx.beginPath(); ctx.arc(_x, _y, lw(7 + o * 16), 0, 6.3); ctx.stroke(); }
      });
      scatola(R.quadro[0] - 0.14, R.quadro[1] - 0.09, R.quadro[0] + 0.14, R.quadro[1] + 0.09, z, 0.3 * f, pal.collTop, pal.reg, f);
      scatola(R.display[0] - 0.16, R.display[1] - 0.02, R.display[0] + 0.16, R.display[1] + 0.02, z, 0.24 * f, pal.reg, pal.coll, f);
      ctx.restore();
    }
    function miniPianta(sx, sy, sc, z, modo) {  // una copia della pianta in piccolo, sul foglio di una tavola
      var ox = sx, oy = sy, i, c;
      function m(x, y) { return [ox + x * sc, oy + y * sc]; }
      ctx.lineJoin = "round";
      ctx.strokeStyle = pal.tavolaLinea; ctx.lineWidth = lw(0.9); ctx.globalAlpha *= 0.9; ctx.beginPath();
      d.locali.forEach(function (l) { l.anelli.forEach(function (r) { r.pts.forEach(function (p, j) { var q = m(p[0], p[1]); pj(q[0], q[1], z); j ? ctx.lineTo(_x, _y) : ctx.moveTo(_x, _y); }); }); });
      ctx.stroke();
      if (modo === 1) {  // moduli e circuiti
        d.moduli.forEach(function (mo) {
          ctx.fillStyle = mo.t === 240 ? pal.m240 : mo.t === 120 ? pal.m120 : pal.m86; ctx.globalAlpha = 0.85; ctx.beginPath();
          var a = m(mo.x0, mo.y0), b = m(mo.x1, mo.y1); quad(a[0], a[1], b[0], b[1], z); ctx.fill();
        });
        ctx.lineWidth = lw(1.1); ctx.globalAlpha = 0.95;
        d.circuiti.forEach(function (cc) { ctx.strokeStyle = pal.mandata; ctx.beginPath(); cc.man.forEach(function (pl) { pl.pts.forEach(function (p, j) { var q = m(p[0], p[1]); pj(q[0], q[1], z); j ? ctx.lineTo(_x, _y) : ctx.moveTo(_x, _y); }); }); ctx.stroke(); });
      } else if (modo === 0) {  // la struttura
        ctx.strokeStyle = pal.struttura; ctx.globalAlpha = 0.8; ctx.lineWidth = lw(0.8); ctx.beginPath();
        d.portanti.forEach(function (s) { var a = m(s.a[0], s.a[1]), b = m(s.b[0], s.b[1]); pj(a[0], a[1], z); ctx.moveTo(_x, _y); pj(b[0], b[1], z); ctx.lineTo(_x, _y); });
        ctx.stroke();
      } else {  // la regolazione
        ctx.strokeStyle = pal.reg; ctx.globalAlpha = 0.9; ctx.lineWidth = lw(1.1); ctx.beginPath();
        d.regBus.forEach(function (pl) { pl.pts.forEach(function (p, j) { var q = m(p[0], p[1]); pj(q[0], q[1], z); j ? ctx.lineTo(_x, _y) : ctx.moveTo(_x, _y); }); });
        ctx.stroke();
        ctx.fillStyle = pal.reg; d.reg.sonde.forEach(function (s) { var q = m(s.xy[0], s.xy[1]); pj(q[0], q[1], z); ctx.beginPath(); ctx.arc(_x, _y, lw(2.4), 0, 6.3); ctx.fill(); });
      }
      void c; void i;
    }
    function tavole() {
      var a = P.tv; if (a < 0.01) return;
      var Sw = d.w * 0.86, Sh = Sw / 1.414, z0 = zl("tv"), titoli = ["Struttura", "Moduli e circuiti", "Regolazione"], notte = pal.alone === "1";
      ctx.save();
      for (var k = 2; k >= 0; k--) {
        var f = usc(prog(a, 2 - k, 3, 0.55)); if (f <= 0.001) continue;
        var z = z0 + k * 0.85 * P.ex + (1 - f) * 1.6, ox = d.cx - Sw / 2 + (k - 1) * 1.7 * f, oy = d.cy - Sh / 2 - (k - 1) * 1.1 * f;
        ctx.globalAlpha = f * (notte ? 0.86 : 0.72); ctx.fillStyle = pal.tavola; ctx.beginPath(); quad(ox, oy, ox + Sw, oy + Sh, z); ctx.fill();
        ctx.globalAlpha = f; ctx.strokeStyle = pal.tavolaLinea; ctx.lineWidth = lw(1.5); ctx.beginPath(); quad(ox, oy, ox + Sw, oy + Sh, z); ctx.stroke();
        ctx.lineWidth = lw(0.8); ctx.globalAlpha = 0.45 * f; ctx.beginPath(); quad(ox + 0.2, oy + 0.2, ox + Sw - 0.2, oy + Sh - 0.2, z); ctx.stroke();
        ctx.globalAlpha = f;
        var sc = Math.min((Sw - 1.1) / d.w, (Sh - 1.1) / d.h);
        miniPianta(ox + 0.55, oy + 0.5, sc, z, k === 0 ? 0 : k === 1 ? 1 : 2);
        // il cartiglio, in basso a destra, con il nome della tavola
        ctx.globalAlpha = f * 0.9; ctx.strokeStyle = pal.tavolaLinea; ctx.lineWidth = lw(0.9); ctx.beginPath();
        quad(ox + Sw - 2.6, oy + Sh - 1.05, ox + Sw - 0.3, oy + Sh - 0.3, z); ctx.stroke();
        ctx.beginPath(); pj(ox + Sw - 2.6, oy + Sh - 0.65, z); ctx.moveTo(_x, _y); pj(ox + Sw - 0.3, oy + Sh - 0.65, z); ctx.lineTo(_x, _y); ctx.stroke();
        pj(ox + Sw - 2.45, oy + Sh - 0.9, z);
        if (proiez.sc > 24) testo(titoli[k], _x, _y, 9.5 * clamp(proiez.sc / 34, 0.8, 1.1), pal.testo, 700, false);
      }
      ctx.restore();
    }
    function verticali() {
      var a = clamp(P.ex * 1.4 - 0.15, 0, 1) * Math.max(P.md, P.st, P.tb, P.tv, P.ce); if (a < 0.02) return;
      var zt = (P.tv > 0.05 ? ZL.tv + 0.55 : P.rg > 0.05 ? ZL.rg : P.ce > 0.05 ? ZL.ce : ZL.md) * P.ex;
      ctx.save(); ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = pal.linea; ctx.lineWidth = 0.7; ctx.setLineDash([2, 4]); ctx.beginPath();
      [[0.45, 0.45], [d.w - 0.45, 0.45], [d.w - 0.45, d.h - 0.45], [0.45, d.h - 0.45]].forEach(function (c) { pj(c[0], c[1], 0); ctx.moveTo(_x, _y); pj(c[0], c[1], zt); ctx.lineTo(_x, _y); });
      ctx.stroke(); ctx.restore();
    }
    function etichette() {
      var a = P.et; if (a < 0.02) return;
      var N = D.numeri, px = 11.5 * clamp(proiez.sc / 34, 0.85, 1.2), sx = proiez.ox;
      var voci = [
        { t: N.moduli + " moduli", x: d.w * 0.22, y: d.h * 0.78, z: zl("md") + 0.1, c: pal.m240 },
        { t: N.circuiti + " circuiti", x: d.w * 0.6, y: d.h * 0.3, z: zl("tb") + 0.1, c: pal.mandata },
        { t: "0 incroci", x: d.w * 0.82, y: d.h * 0.62, z: zl("tb") + 0.1, c: pal.ritorno },
        { t: N.area_attiva.toString().replace(".", ",") + " m²", x: d.w * 0.12, y: d.h * 0.2, z: zl("md") + 0.1, c: pal.m86 }
      ];
      ctx.save();
      voci.forEach(function (v, i) {
        var f = usc(prog(a, i, voci.length, 0.5)); if (f <= 0) return;
        pj(v.x, v.y, v.z); var bx = _x, by = _y; pj(v.x, v.y, v.z + 0.9); var tx2 = _x, ty2 = _y - 6 * f;
        ctx.globalAlpha = f; ctx.strokeStyle = v.c; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx2, ty2); ctx.stroke();
        ctx.font = "700 " + px + "px " + pal.font; var w = ctx.measureText(v.t).width + 16, h = px + 11;
        ctx.fillStyle = pal.tavola; ctx.globalAlpha = f * 0.96; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(tx2 - w / 2, ty2 - h, w, h, h / 2); else ctx.rect(tx2 - w / 2, ty2 - h, w, h);
        ctx.fill(); ctx.strokeStyle = v.c; ctx.globalAlpha = f * 0.7; ctx.stroke();
        ctx.globalAlpha = f; testo(v.t, tx2, ty2 - h / 2, px, pal.testo, 700, true);
      });
      void sx; ctx.restore();
    }

    function disegna() {
      if (!W || !H) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      imp();
      griglia(); contorni(); travi(); quota(); verticali(); struttura(); moduli(); circuiti(); collettori(); centrale(); regolazione(); tavole(); etichette();
    }

    // ---- fisica: molle e ciclo di disegno -----------------------------------------------------------------------------------
    function passoFisica(dt) {
      var fermo = true, key, kk, x, v, a, c;
      for (key in A) {
        kk = RIGIDITA[key] || 40; c = 2 * Math.sqrt(kk) * (key === "ex" || key === "md" ? 0.82 : 0.9);
        x = P[key]; v = V[key]; a = A[key];
        v += (kk * (a - x) - c * v) * dt; x += v * dt;
        if (Math.abs(a - x) < 0.0006 && Math.abs(v) < 0.0008) { x = a; v = 0; } else fermo = false;
        P[key] = x; V[key] = v;
      }
      // l'inclinazione verso il puntatore
      var k2 = 55, c2 = 2 * Math.sqrt(k2) * 0.95;
      tiltVX += (k2 * (tx - tiltX) - c2 * tiltVX) * dt; tiltX += tiltVX * dt;
      tiltVY += (k2 * (ty - tiltY) - c2 * tiltVY) * dt; tiltY += tiltVY * dt;
      if (Math.abs(tx - tiltX) > 0.01 || Math.abs(ty - tiltY) > 0.01 || Math.abs(tiltVX) > 0.01 || Math.abs(tiltVY) > 0.01) fermo = false;
      return fermo;
    }
    function giro(ts) {
      raf = 0;
      if (!visibile) return;
      var dt = Math.min(0.05, (ts - ultimo) / 1000 || 0.016); ultimo = ts; tempo = (ts - t0) / 1000;
      var n = Math.ceil(dt / 0.008), i, fermo = true;
      for (i = 0; i < n; i++) fermo = passoFisica(dt / n) && fermo;
      if (opz.deriva && !quieto && !interagisce) { tiltX = tiltX; }
      disegna();
      var vivo = !quieto && (opz.luce !== false) && ((P.tb > 0.98) || (P.rg > 0.95));
      if (!fermo || vivo || (opz.deriva && !quieto)) raf = requestAnimationFrame(giro);
    }
    function sveglia() { if (!raf && visibile) { ultimo = performance.now(); raf = requestAnimationFrame(giro); } }

    function misura() {
      var r = canvas.getBoundingClientRect(), nw = Math.round(r.width), nh = Math.round(r.height), nd = Math.min(window.devicePixelRatio || 1, opz.dprMax || 2.5);
      if (!nw || !nh) return;
      nd = Math.min(nd, Math.sqrt(3.4e6 / (nw * nh)));  // un canvas grande non supera ~3,4 milioni di pixel (la scena resta nitida e il telefono regge i 60 fps)
      nd = Math.max(1, nd);
      if (nw !== W || nh !== H || nd !== dpr) { W = nw; H = nh; dpr = nd; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); disegna(); }
    }
    var oss = null;
    if ("ResizeObserver" in window) { oss = new ResizeObserver(function () { misura(); sveglia(); }); oss.observe(canvas); }
    misura();

    // l'inclinazione verso il puntatore: solo dove c'è un puntatore preciso; sul tocco la rotazione nasce dallo scorrimento (yaw dei passi)
    var tiltAttivo = opz.tilt && window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !quieto;
    function puntatore(e) {
      var r = canvas.getBoundingClientRect();
      var u = clamp((e.clientX - (r.left + r.width / 2)) / Math.max(320, window.innerWidth * 0.5), -1, 1), v = clamp((e.clientY - (r.top + r.height / 2)) / Math.max(320, window.innerHeight * 0.5), -1, 1);
      tx = u * 7; ty = -v * 3.5; sveglia();
    }
    if (tiltAttivo) document.addEventListener("pointermove", function (e) { if (visibile && e.pointerType === "mouse") puntatore(e); }, { passive: true });

    var api = {
      canvas: canvas,
      imposta: function (s, subito) {
        var key;
        for (key in s) if (key in A) A[key] = s[key];
        if (subito || quieto) { for (key in s) if (key in P) { P[key] = A[key]; V[key] = 0; } if (W) { disegna(); } }
        sveglia();
      },
      visibile: function (v) { v = !!v; if (v === visibile) return; visibile = v; if (v) { misura(); t0 = t0 || performance.now(); sveglia(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; } },
      ridisegna: function () { misura(); disegna(); },
      tavolozza: function () { pal = leggiTavolozza(); if (W) disegna(); },
      stato: function () { var o = {}, key; for (key in P) o[key] = P[key]; return o; },
      destroy: function () { if (oss) oss.disconnect(); if (raf) cancelAnimationFrame(raf); visibile = false; },
      d: d
    };
    void base;
    return api;
  }

  window.CapomastroScena = { crea: crea, STATI: STATI, stato: stato, prog: prog };
})();
