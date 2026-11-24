/*
 * Capomastro · pagina pubblica · comportamento. Un solo ritmo di movimento (molle e uscite morbide), nessuna navigazione e nessuno scorrimento
 * forzato dallo script: il download parte solo da un clic sul pulsante, la pagina non si sposta mai da sola, mai preventDefault su tocco o
 * rotellina. Gli ascoltatori di scorrimento sono passivi. Senza JavaScript la pagina si vede e si legge per intero.
 *
 * Indice: sistema e download · tema giorno/notte · titoli a parole, comparse e contatori · scene isometriche · isola · pannello del telefono ·
 * guida vocale · scorrimento · percorso dei dodici passi · video in loop · tutorial e novità · puntatore · caricamento.
 */
(function () {
  "use strict";
  window.__cm = { versione: "2027" };  // lo script principale è partito: la rete di sicurezza dello script in testa non interviene più
  var REPO = "iannelloservass-bot/radius-project";
  var NOME_WIN = "radius-project_install.exe";
  var NOME_MAC = "radius-project_mac.dmg";
  var ULTIMA = "https://github.com/" + REPO + "/releases/latest/download/";
  var $ = function (id) { return document.getElementById(id); };
  var html = document.documentElement;
  var mq = function (q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } };
  var quieto = mq("(prefers-reduced-motion: reduce)");
  var fine = mq("(hover: hover) and (pointer: fine)");
  var osserva = "IntersectionObserver" in window;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var tutti = function (sel, radice) { return [].slice.call((radice || document).querySelectorAll(sel)); };
  var adesso = function () { return window.performance && performance.now ? performance.now() : Date.now(); };
  // Nessuna navigazione dello script: il download parte solo da un clic sul pulsante, la pagina non si sposta da sola. Gli indirizzi
  // con un'ancora (#tutorial, #novita-<id>…) li segue il browser; lo script sceglie solo il video nel lettore.

  // un indirizzo #novita-<id> o #tutorial-<id> con un id che non c'è lascia la sezione: l'indirizzo diventa #novita o #tutorial (solo l'URL, mai lo scorrimento)
  (function () {
    var m = /^#(novita|tutorial)-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(location.hash || "");
    if (m && m[2] !== "3-0" && !$(m[1] + "-" + m[2])) { try { history.replaceState(null, "", "#" + m[1]); } catch (e) { /* senza history */ } }
  })();

  // ====================================================================================================================================
  // sistema, download e versione
  // ====================================================================================================================================
  function sistema() {
    var ua = navigator.userAgent || "";
    var piattaforma = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    var tocco = (navigator.maxTouchPoints || 0) > 1;
    if (/android|iphone|ipad|ipod/i.test(ua) || (/mac/i.test(piattaforma) && tocco)) return "mobile";
    if (/win/i.test(piattaforma) || /windows/i.test(ua)) return "windows";
    if (/mac/i.test(piattaforma) || /mac os x|macintosh/i.test(ua)) return "mac";
    return "altro";
  }
  // la scheda del download ha subito la forma definitiva (i pulsanti che il sistema nasconde lo sono già): l'arrivo della risposta
  // di GitHub cambia solo i testi e gli indirizzi, e non sposta la pagina (neppure l'ancora #novita)
  (function () {
    var os = sistema();
    if (os === "windows") $("win").classList.add("nascosto");
    else if (os === "mac") $("mac").classList.add("nascosto");
    else $("principale").classList.add("nascosto");
  })();
  function data(iso) {
    try { return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }); }
    catch (e) { return ""; }
  }
  function imposta(link, url) {
    if (url) { link.href = url; link.classList.remove("spento"); link.removeAttribute("aria-disabled"); }
    else { link.removeAttribute("href"); link.classList.add("spento"); link.setAttribute("aria-disabled", "true"); }
  }
  function mostra(rilascio) {
    var os = sistema();
    var urlWin = ULTIMA + NOME_WIN, urlMac = null, versione = "";
    if (rilascio) {
      versione = (rilascio.tag_name || "").replace(/^v/, "");
      (rilascio.assets || []).forEach(function (a) {
        if (a.name === NOME_WIN) urlWin = a.browser_download_url;
        if (a.name === NOME_MAC) urlMac = a.browser_download_url;
      });
      $("versione").textContent = "Versione " + versione + (rilascio.published_at ? " · pubblicata il " + data(rilascio.published_at) : "");
    } else {
      urlMac = ULTIMA + NOME_MAC;  // informazioni non disponibili: si prova l'indirizzo stabile
    }
    imposta($("win"), urlWin);
    imposta($("mac"), urlMac);
    var principale = $("principale");
    if (os === "windows") {
      $("titolo").textContent = "Pronto per Windows";
      $("testo").textContent = "Premi il pulsante per scaricare Capomastro. Le istruzioni per l'installazione sono più in basso.";
      principale.textContent = "Scarica per Windows" + (versione ? " · " + versione : "");
      imposta(principale, urlWin);
      $("passi-win").classList.add("tuo");
      $("win").classList.add("nascosto");
    } else if (os === "mac" && urlMac) {
      $("titolo").textContent = "Scarica Capomastro per Mac";
      $("testo").textContent = "Premi il pulsante per scaricare il programma. Le istruzioni per l'installazione sono più in basso.";
      principale.textContent = "Scarica per Mac" + (versione ? " · " + versione : "");
      imposta(principale, urlMac);
      $("passi-mac").classList.add("tuo");
      $("mac").classList.add("nascosto");
    } else if (os === "mac") {
      $("titolo").textContent = "La versione per Mac arriva a breve";
      $("testo").textContent = "È in preparazione: riapri questo link fra qualche giorno. La versione per Windows è già disponibile.";
      principale.classList.add("nascosto");
      $("passi-mac").classList.add("tuo");
    } else {
      $("titolo").textContent = "Apri questo link da un computer";
      $("testo").textContent = os === "mobile"
        ? "Il programma si installa su un computer Windows o Mac: inviati il link per e-mail e aprilo dal computer, oppure scegli qui sotto."
        : "Il programma è disponibile per Windows e per Mac: scegli qui sotto il sistema del computer su cui installarlo.";
      principale.classList.add("nascosto");
    }
  }
  var fatto = false;
  var riserva = setTimeout(function () { if (!fatto) { fatto = true; mostra(null); } }, 4000);
  fetch("https://api.github.com/repos/" + REPO + "/releases/latest", { headers: { Accept: "application/vnd.github+json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rilascio) { if (!fatto) { fatto = true; clearTimeout(riserva); mostra(rilascio); } })
    .catch(function () { if (!fatto) { fatto = true; clearTimeout(riserva); mostra(null); } });

  // a scheda nascosta le animazioni continue si fermano
  document.addEventListener("visibilitychange", function () { html.classList.toggle("nascosta", document.hidden); });

  // ====================================================================================================================================
  // il tema: giorno o notte dall'orario del dispositivo (script in testa: __cmTema), anche mentre la pagina è aperta; la scelta di chi usa
  // la pagina vale più dell'orario. Un timer a catena (un controllo alla volta, mai un intervallo fisso) e il ricalcolo quando la scheda torna visibile.
  // ====================================================================================================================================
  var CT = window.__cmTema || { sole: function () { return null; }, perOrario: function () { return "giorno"; }, pref: function () { return "auto"; }, calcola: function () { return "giorno"; } };
  var scenePronte = [];  // le scene da ricolorare al cambio di tema
  var tmTema = 0;
  var btnTema = [$("tema"), $("tema-menu")];
  function temaAttuale() { return html.getAttribute("data-tema") === "notte" ? "notte" : "giorno"; }
  function aggiornaBottoniTema() {
    var cur = temaAttuale(), pref = CT.pref(), altro = cur === "notte" ? "giorno" : "notte";
    var testo = pref === "auto" ? "Tema: automatico, ora " + cur : "Tema: " + cur + " (scelto da te)";
    btnTema.forEach(function (b) {
      if (!b) return;
      b.setAttribute("data-pref", pref);
      b.setAttribute("aria-label", testo + ". Passa al tema " + altro);
      b.title = testo;
    });
    var t = document.querySelector(".pn-tema-t"); if (t) t.textContent = pref === "auto" ? "Tema: automatico" : "Tema: " + cur;
  }
  function mettiTema(t) {
    html.setAttribute("data-tema", t);
    var m = $("meta-colore"); if (m) m.setAttribute("content", t === "notte" ? "#050b1a" : "#f5f8fd");
    scenePronte.forEach(function (s) { try { s.tavolozza(); } catch (e) { /* scena non ancora pronta */ } });
    aggiornaBottoniTema();
  }
  // il cambio con una rivelazione circolare dove il browser sa fare le View Transitions, altrimenti una dissolvenza dei colori
  function cambiaTema(nuovo, x, y) {
    if (nuovo === temaAttuale()) { aggiornaBottoniTema(); return; }
    if (!quieto && document.startViewTransition) {
      try {
        var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        var vt = document.startViewTransition(function () { mettiTema(nuovo); });
        vt.ready.then(function () {
          html.animate({ clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + r + "px at " + x + "px " + y + "px)"] },
            { duration: 900, easing: "cubic-bezier(.22, 1, .36, 1)", pseudoElement: "::view-transition-new(root)" });
        }, function () { /* transizione saltata */ });
        return;
      } catch (e) { /* ripiego sotto */ }
    }
    if (!quieto) { html.classList.add("cambio-tema"); setTimeout(function () { html.classList.remove("cambio-tema"); }, 700); }
    mettiTema(nuovo);
  }
  function prossimoCambioMs(ora) {
    var s = CT.sole(ora) || { alba: 420, tramonto: 1140 };
    var m = ora.getHours() * 60 + ora.getMinutes() + ora.getSeconds() / 60, p;
    if (m < s.alba) p = s.alba;
    else if (m < s.tramonto) p = s.tramonto;
    else { var s2 = CT.sole(new Date(ora.getTime() + 864e5)) || { alba: 420 }; p = 1440 + s2.alba; }
    return Math.max(1000, (p - m) * 60000 + 800);
  }
  function programmaTema() {  // il prossimo controllo: al più fra 15 minuti (un orologio cambiato, l'ora legale) e al più alla prossima alba o tramonto
    clearTimeout(tmTema);
    if (CT.pref() !== "auto" || /[?&]tema=/.test(location.search)) return;
    tmTema = setTimeout(function () { controllaTema(); }, Math.min(prossimoCambioMs(new Date()), 15 * 60 * 1000));
  }
  function controllaTema(x, y) {
    if (CT.pref() === "auto" && !/[?&]tema=/.test(location.search)) cambiaTema(CT.perOrario(new Date()), x == null ? innerWidth / 2 : x, y == null ? 0 : y);
    programmaTema();
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) controllaTema(); });
  function clicTema(e) {
    var b = e.currentTarget, r = b.getBoundingClientRect(), cur = temaAttuale(), target = cur === "notte" ? "giorno" : "notte";
    var auto = CT.perOrario(new Date());
    try { localStorage.setItem("cm-tema", target === auto ? "auto" : target); } catch (er) { /* archivio non disponibile */ }
    cambiaTema(target, r.left + r.width / 2, r.top + r.height / 2);
    programmaTema();
  }
  btnTema.forEach(function (b) { if (b) b.addEventListener("click", clicTema); });
  aggiornaBottoniTema(); programmaTema();

  // ====================================================================================================================================
  // titoli a parole (ognuna dentro la sua maschera), comparse allo scorrimento, contatori
  // ====================================================================================================================================
  function spezza(radice) {
    var k = 0;
    (function visita(nodo) {
      [].slice.call(nodo.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var pezzi = n.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
          pezzi.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"), i = document.createElement("span");
            w.className = "w"; i.className = "w-i"; i.style.setProperty("--k", k++); i.textContent = p;
            w.appendChild(i); frag.appendChild(w);
          });
          nodo.replaceChild(frag, n);
        } else if (n.nodeType === 1) { visita(n); }
      });
    })(radice);
    radice.classList.add("diviso");
  }
  var titoli = tutti("[data-split]");
  titoli.forEach(spezza);
  function suVista(elementi, fn, soglia, margine) {
    if (!osserva || quieto) { elementi.forEach(fn); return; }
    var o = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) { if (v.isIntersecting) { o.unobserve(v.target); fn(v.target); } });
    }, { threshold: soglia || 0.15, rootMargin: margine || "0px 0px -8% 0px" });
    elementi.forEach(function (e) { o.observe(e); });
  }
  var aggiungiVista = function (e) { e.classList.add("vista"); };
  suVista(titoli.filter(function (t) { return t.id !== "titolo-eroe"; }), aggiungiVista, 0.3);
  tutti(".cascata").forEach(function (c) { [].forEach.call(c.children, function (f, k) { f.style.setProperty("--i", k); }); });
  suVista(tutti(".cascata, [data-r], .piede-gigante, .cg-sez, .mini-piano"), aggiungiVista, 0.12);
  suVista(tutti(".n[data-n]"), function (el) {
    var fine = parseFloat(el.getAttribute("data-n")), dec = parseInt(el.getAttribute("data-dec") || "0", 10), t0 = null;
    var testo = function (v) { return v.toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    if (quieto || !isFinite(fine) || fine === 0) { el.textContent = testo(isFinite(fine) ? fine : 0); return; }
    var passo = function (ts) {
      if (t0 === null) t0 = ts;
      var q = clamp((ts - t0) / 1500, 0, 1), e = 1 - Math.pow(1 - q, 4);
      el.textContent = testo(fine * e);
      if (q < 1) requestAnimationFrame(passo); else el.textContent = testo(fine);
    };
    el.textContent = testo(0);
    requestAnimationFrame(passo);
  }, 0.4);
  // i prezzi dei piani contano dall'alto verso il valore (il testo vero resta nell'HTML e negli attributi)
  suVista(tutti(".piano .prezzo"), function (el) {
    var art = el.closest(".piano"), v = art ? parseInt(art.getAttribute("data-prezzo"), 10) : NaN, piccolo = el.querySelector("small"), t0 = null;
    if (quieto || !isFinite(v)) return;
    var passo = function (ts) {
      if (t0 === null) t0 = ts;
      var q = clamp((ts - t0) / 1100, 0, 1), e = 1 - Math.pow(1 - q, 4);
      el.firstChild.nodeValue = String(Math.round(v * e));
      if (q < 1) requestAnimationFrame(passo); else el.firstChild.nodeValue = String(v);
    };
    if (piccolo && el.firstChild && el.firstChild.nodeType === 3) requestAnimationFrame(passo);
  }, 0.5);
  // i nastri scorrono solo mentre si vedono
  if (osserva) {
    var nastri = tutti(".nastro");
    var oN = new IntersectionObserver(function (voci) { voci.forEach(function (v) { v.target.classList.toggle("in-vista", v.isIntersecting); }); });
    nastri.forEach(function (n) { oN.observe(n); });
  }

  // ====================================================================================================================================
  // le scene isometriche: il Progetto Rossi dal motore (scena/rossi.json), un'istanza per ogni luogo
  // ====================================================================================================================================
  var SC = window.CapomastroScena, DATI = null, sceneInst = {}, promessaDati = null;
  function datiScena() {
    if (!promessaDati) {
      promessaDati = fetch("scena/rossi.json?v=20261118a").then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("rossi.json")); })
        .then(function (d) { DATI = d; return d; }).catch(function () { DATI = null; return null; });
    }
    return promessaDati;
  }
  function creaScena(nome, canvas, opz, stato0) {
    if (!SC || !DATI || !canvas) return null;
    try {
      var s = SC.crea(canvas, DATI, opz || {});
      s.imposta(stato0 || SC.STATI.vuota, true);
      sceneInst[nome] = s; scenePronte.push(s);
      return s;
    } catch (e) { return null; }
  }
  // una scena visibile solo mentre il suo canvas si vede (il ciclo di disegno si ferma da sola)
  function osservaScena(s, el, margine) {
    if (!s) return;
    if (!osserva) { s.visibile(true); return; }
    new IntersectionObserver(function (voci) { s.visibile(voci[0].isIntersecting); }, { rootMargin: margine || "10% 0px 10% 0px" }).observe(el);
  }
  // un pezzo dopo l'altro: le tappe {ritardo ms → pezzi di stato}
  function sequenza(s, tappe) {
    if (!s) return;
    if (quieto) { var tot = {}; tappe.forEach(function (t) { for (var k in t[1]) tot[k] = t[1][k]; }); s.imposta(tot, true); return; }
    tappe.forEach(function (t) { setTimeout(function () { s.imposta(t[1]); }, t[0]); });
  }
  var COSTRUISCI = [
    [0, { c: 1 }], [450, { st: 1 }], [900, { md: 1, ex: 0.5 }], [1500, { tb: 1, co: 1 }], [2200, { ce: 1, ex: 0.8 }], [2700, { rg: 1, ex: 0.95 }], [3300, { tv: 0.9, ex: 1, yaw: 42 }]
  ];
  function avviaScene() {
    if (!SC) return;
    datiScena().then(function (d) {
      if (!d) return;
      // eroe: si costruisce quando la pagina è entrata
      var eroe = creaScena("eroe", $("eroe-scena"), { tilt: true, deriva: false }, SC.stato({ yaw: 42, pit: 34, c: 0.0 }));
      osservaScena(eroe, $("eroe-scena"));
      avviaPercorso();
      // i moduli: la scena si costruisce quando il palcoscenico arriva
      var mod = creaScena("moduli", $("modulo-scena"), { tilt: true }, SC.stato({ yaw: 44, pit: 36 }));
      osservaScena(mod, $("modulo-scena"));
      if (mod && osserva) {
        var oM = new IntersectionObserver(function (v) { if (v[0].isIntersecting) { oM.disconnect(); sequenza(mod, [[0, { c: 1 }], [350, { st: 1, md: 1, ex: 0.55 }], [1200, { tb: 1, co: 1 }]]); } }, { threshold: 0.25 });
        oM.observe($("modulo-scena"));
      } else if (mod) { mod.imposta(SC.STATI.moduli, true); }
      var pal = creaScena("palco", $("palco-scena"), { tilt: true }, SC.stato({ yaw: 44, pit: 36 }));
      osservaScena(pal, $("palco-scena"));
      if (pal && osserva) {
        var oP = new IntersectionObserver(function (v) { if (v[0].isIntersecting) { oP.disconnect(); sequenza(pal, [[0, { c: 1 }], [300, { st: 1, md: 1, ex: 0.55 }], [1100, { tb: 1, co: 1 }]]); } }, { threshold: 0.25 });
        oP.observe($("palco-scena"));
      } else if (pal) { pal.imposta(SC.STATI.moduli, true); }
      if (html.classList.contains("entrato") || !html.classList.contains("carica")) costruisciEroe();
    });
  }
  var eroeCostruito = false;
  function costruisciEroe() {
    if (eroeCostruito || !sceneInst.eroe) return;
    eroeCostruito = true;
    sequenza(sceneInst.eroe, COSTRUISCI);
  }

  // ====================================================================================================================================
  // l'isola: sezioni con la lente a molla, condensazione, avanzamento
  // ====================================================================================================================================
  var isola = $("isola"), corpo = $("isola-corpo"), lente = $("i-lente"), lista = $("menu-orizz"), navOriz = $("menu-nav");
  var statoNome = $("i-stato-nome"), statoN = $("i-stato-n"), filo = $("i-filo-i");
  var SEZIONI = [
    { id: "scarica", nome: "Capomastro", sez: null },
    { id: "moduli", nome: "Moduli", sez: "moduli" },
    { id: "funzioni", nome: "Percorso", sez: "funzioni" },
    { id: "tutorial", nome: "Tutorial", sez: "tutorial" },
    { id: "novita-3-0", nome: "Novità 3.0", sez: "tutorial" },
    { id: "licenze", nome: "Licenze", sez: "licenze" },
    { id: "requisiti", nome: "Requisiti", sez: "requisiti" },
    { id: "documenti", nome: "Documenti", sez: "requisiti" }
  ];
  var vociSez = {};
  tutti("[data-sez]").forEach(function (a) { var s = a.getAttribute("data-sez"); (vociSez[s] = vociSez[s] || []).push(a); });
  var correnteSez = null, correnteIdx = 0, sezProgresso = 0;
  // la lente: i due bordi seguono la voce con due molle diverse, così si allunga e si raccoglie come una goccia
  var L = { x0: 0, x1: 0, v0: 0, v1: 0, t0: 0, t1: 0, raf: 0, ult: 0, pronta: false };
  function bersaglioLente() {
    var a = (vociSez[correnteSez] || []).filter(function (x) { return navOriz && navOriz.contains(x); })[0];
    if (!a || !navOriz) return null;
    var r = a.getBoundingClientRect(), n = navOriz.getBoundingClientRect();
    return [r.left - n.left, r.right - n.left];
  }
  function giroLente(ts) {
    L.raf = 0;
    var dt = Math.min(0.04, (ts - L.ult) / 1000 || 0.016); L.ult = ts;
    var k0 = 380, c0 = 2 * Math.sqrt(k0) * 0.62, k1 = 190, c1 = 2 * Math.sqrt(k1) * 0.7;
    var avanti = L.t0 > L.x0, k_a = avanti ? k1 : k0, c_a = avanti ? c1 : c0, k_b = avanti ? k0 : k1, c_b = avanti ? c0 : c1;
    L.v0 += (k_a * (L.t0 - L.x0) - c_a * L.v0) * dt; L.x0 += L.v0 * dt;
    L.v1 += (k_b * (L.t1 - L.x1) - c_b * L.v1) * dt; L.x1 += L.v1 * dt;
    if (lente) { lente.style.setProperty("--lx", L.x0.toFixed(2) + "px"); lente.style.setProperty("--lw", Math.max(10, L.x1 - L.x0).toFixed(2) + "px"); }
    var fermo = Math.abs(L.t0 - L.x0) < 0.2 && Math.abs(L.t1 - L.x1) < 0.2 && Math.abs(L.v0) < 0.5 && Math.abs(L.v1) < 0.5;
    if (!fermo) L.raf = requestAnimationFrame(giroLente);
  }
  function posizionaLente(subito) {
    if (!lente) return;
    var b = bersaglioLente();
    if (!b || corpo.getAttribute("data-condensata") === "1") { lente.classList.remove("pronta"); L.pronta = false; return; }
    L.t0 = b[0]; L.t1 = b[1];
    if (!L.pronta || subito || quieto) { L.x0 = b[0]; L.x1 = b[1]; L.v0 = L.v1 = 0; L.pronta = true; giroLente(adesso()); lente.classList.add("pronta"); return; }
    lente.classList.add("pronta");
    if (!L.raf) { L.ult = adesso(); L.raf = requestAnimationFrame(giroLente); }
  }
  function evidenzia(sez) {
    if (sez === correnteSez) return;
    if (correnteSez) (vociSez[correnteSez] || []).forEach(function (a) { a.removeAttribute("aria-current"); });
    correnteSez = sez;
    if (correnteSez) (vociSez[correnteSez] || []).forEach(function (a) { a.setAttribute("aria-current", "true"); });
    posizionaLente(false);
  }
  var passoCorrente = 0, inPercorso = false;
  function scriviStato() {
    var s = SEZIONI[correnteIdx], n;
    if (statoNome && statoNome.textContent !== s.nome) statoNome.textContent = s.nome;
    n = inPercorso && s.id === "funzioni" ? (passoCorrente + 1 < 10 ? "0" : "") + (passoCorrente + 1) + "/12" : (s.id === "scarica" ? "" : Math.round(sezProgresso * 100) + "%");
    if (statoN && statoN.textContent !== n) statoN.textContent = n;
  }
  function calcolaSezione(vh) {
    var linea = vh * 0.4, idx = 0, i, r, e;
    for (i = 0; i < SEZIONI.length; i++) {
      e = $(SEZIONI[i].id); if (!e) continue;
      if (e.getBoundingClientRect().top <= linea) idx = i;
    }
    e = $(SEZIONI[idx].id); r = e.getBoundingClientRect();
    sezProgresso = clamp(-r.top / Math.max(1, r.height - vh * 0.6), 0, 1);
    inPercorso = SEZIONI[idx].id === "funzioni";
    if (idx !== correnteIdx) { correnteIdx = idx; }
    evidenzia(SEZIONI[idx].sez);
    scriviStato();
    if (lente) lente.style.setProperty("--sp", sezProgresso.toFixed(3));
  }
  // condensazione: scorrendo in giù l'isola si raccoglie (marchio, sezione, avanzamento), si riespande salendo o al passaggio del puntatore
  var cond = false, ultimoY = 0, salita = 0, sopraIsola = false, larg = 0;
  function impostaCond(v, subito) {
    if (v === cond) return;
    var prima = corpo.getBoundingClientRect().width;
    cond = v;
    corpo.setAttribute("data-condensata", v ? "1" : "0");
    if (innerWidth < 700) { posizionaLente(true); return; }
    if (quieto || subito) { corpo.style.width = ""; posizionaLente(true); return; }
    corpo.style.width = ""; var dopo = corpo.getBoundingClientRect().width;
    corpo.style.width = prima + "px"; void corpo.offsetWidth;
    corpo.style.transition = "width .85s var(--molla), transform .9s var(--molla), opacity .5s ease";
    corpo.style.width = dopo + "px";
    clearTimeout(larg);
    larg = setTimeout(function () { corpo.style.width = ""; corpo.style.transition = ""; posizionaLente(true); }, 900);
  }
  function aggiornaCond(y) {
    var dy = y - ultimoY; ultimoY = y;
    if (innerWidth < 700) return;
    if (y < 120) { salita = 0; if (!sopraIsola) impostaCond(false); return; }
    if (dy > 4 && !sopraIsola) { salita = 0; impostaCond(true); }
    else if (dy < -2) { salita += -dy; if (salita > 28) impostaCond(false); }
  }
  if (isola) {
    isola.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { sopraIsola = true; impostaCond(false); } });
    isola.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { sopraIsola = false; if (pageYOffset > 160) setTimeout(function () { if (!sopraIsola && pageYOffset > 160) impostaCond(true); }, 500); } });
    isola.addEventListener("focusin", function () { sopraIsola = true; impostaCond(false); });
    isola.addEventListener("focusout", function () { sopraIsola = false; });
  }

  // ====================================================================================================================================
  // il pannello del telefono: nasce dall'isola e riempie lo schermo; si chiude trascinando verso il basso, con X, Esc o scegliendo una voce
  // ====================================================================================================================================
  var pannello = $("menu"), apri = $("apri-menu"), chiudiBtn = $("chiudi-menu"), pnCorpo = $("pn-corpo"), pnTesta = $("pn-testa");
  var aperto = false, pnRaf = 0, trascina = false, minis = null, B0 = 1;
  var S = { t: 0, l: 0, r: 0, b: 0, q: 0, y: 0 }, SV = { t: 0, l: 0, r: 0, b: 0, q: 0, y: 0 }, ST = { t: 0, l: 0, r: 0, b: 0, q: 0, y: 0 };
  var fuori = function () { return [document.querySelector("main"), document.querySelector("footer")]; };
  var inerte = function (el, v) { if (el) { try { el.inert = v; } catch (e) { /* senza inert */ } } };
  function rettIsola() { var r = corpo.getBoundingClientRect(); return { t: r.top, l: r.left, r: innerWidth - r.right, b: innerHeight - r.bottom, q: r.height / 2, y: 0 }; }
  function applicaPannello() {
    pnCorpo.style.clipPath = "inset(" + S.t.toFixed(1) + "px " + S.r.toFixed(1) + "px " + S.b.toFixed(1) + "px " + S.l.toFixed(1) + "px round " + Math.max(0, S.q).toFixed(1) + "px)";
    pnCorpo.style.transform = "translate3d(0, " + S.y.toFixed(1) + "px, 0)";
    var p = 1 - clamp(S.b / Math.max(1, B0), 0, 1);
    pannello.style.setProperty("--vel", (p * clamp(1 - S.y / (innerHeight * 0.6), 0, 1)).toFixed(3));
  }
  function giroPannello(ts) {
    pnRaf = 0;
    var dt = Math.min(0.04, (ts - (giroPannello.ult || ts)) / 1000 || 0.016), fermo = true;
    giroPannello.ult = ts;
    ["t", "l", "r", "b", "q", "y"].forEach(function (k) {
      var rig = k === "y" ? 200 : 170, c = 2 * Math.sqrt(rig) * (k === "y" ? 0.9 : 0.8);
      SV[k] += (rig * (ST[k] - S[k]) - c * SV[k]) * dt; S[k] += SV[k] * dt;
      if (Math.abs(ST[k] - S[k]) > 0.35 || Math.abs(SV[k]) > 2) fermo = false;
    });
    applicaPannello();
    if (fermo) {
      ["t", "l", "r", "b", "q", "y"].forEach(function (k) { S[k] = ST[k]; SV[k] = 0; });
      applicaPannello();
      if (!aperto) { pannello.classList.remove("apre-in", "aperto", "chiudendo"); html.classList.remove("isola-nascosta"); }
      return;
    }
    pnRaf = requestAnimationFrame(giroPannello);
  }
  function avviaPannello() { if (!pnRaf) { giroPannello.ult = 0; pnRaf = requestAnimationFrame(giroPannello); } }
  function creaMiniature() {
    if (minis || !SC || !DATI) return;
    minis = [];
    var stati = { moduli: SC.STATI.moduli, percorso: SC.STATI.passi[7], tutorial: SC.STATI.completa, licenze: SC.STATI.passi[5], requisiti: SC.STATI.passi[4] };
    tutti(".pn-mini").forEach(function (c) {
      var nome = c.getAttribute("data-mini"), s = creaScena("mini-" + nome, c, { luce: false, dprMax: 2 }, SC.stato({ yaw: 44, pit: 36 }));
      if (!s) return;
      s.imposta(stati[nome] || SC.STATI.moduli, true); s.visibile(true); minis.push(s);
    });
  }
  function menu(vuoi, rendiFocus) {
    if (!pannello || vuoi === aperto) return;
    aperto = vuoi;
    apri.setAttribute("aria-expanded", vuoi ? "true" : "false");
    apri.setAttribute("aria-label", vuoi ? "Chiudi il menu" : "Apri il menu");
    html.classList.toggle("menu-aperto", vuoi);
    fuori().forEach(function (e) { inerte(e, vuoi); });
    var k, r = rettIsola();
    if (vuoi) {
      B0 = Math.max(1, r.b);
      for (k in S) { S[k] = r[k]; SV[k] = 0; ST[k] = 0; }
      pannello.classList.remove("chiudendo"); pannello.classList.add("apre-in", "aperto"); html.classList.add("isola-nascosta");
      creaMiniature();
      applicaPannello();
      if (quieto) { for (k in S) S[k] = 0; applicaPannello(); } else avviaPannello();
      setTimeout(function () { var p = tutti("a[href], button", pannello).filter(function (x) { return x.offsetParent !== null; })[0]; if (p) p.focus({ preventScroll: true }); }, 380);
    } else {
      pannello.classList.add("chiudendo");
      for (k in ST) ST[k] = r[k];
      ST.y = 0;
      if (quieto) { for (k in S) S[k] = ST[k]; applicaPannello(); pannello.classList.remove("apre-in", "aperto", "chiudendo"); html.classList.remove("isola-nascosta"); }
      else avviaPannello();
      if (rendiFocus) apri.focus({ preventScroll: true });
    }
  }
  if (apri && pannello) {
    apri.addEventListener("click", function () { menu(!aperto, true); });
    if (chiudiBtn) chiudiBtn.addEventListener("click", function () { menu(false, true); });
    pannello.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a[href]"); if (a) menu(false, false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && aperto) menu(false, true); });
    // trascinare l'intestazione verso il basso chiude il pannello: il pannello segue il dito, poi, se basta, si chiude con la molla
    var d0 = 0, dtm = 0, v0 = 0, vy = 0;
    pnTesta.addEventListener("pointerdown", function (e) { trascina = true; d0 = e.clientY - S.y; dtm = adesso(); v0 = e.clientY; vy = 0; try { pnTesta.setPointerCapture(e.pointerId); } catch (er) { /* senza capture */ } });
    pnTesta.addEventListener("pointermove", function (e) {
      if (!trascina) return;
      var dy = Math.max(0, e.clientY - d0), t = adesso();
      vy = 0.6 * vy + 0.4 * ((e.clientY - v0) / Math.max(1, t - dtm) * 1000); v0 = e.clientY; dtm = t;
      S.y = dy; ST.y = dy; SV.y = 0; applicaPannello();
    });
    var fineTrascina = function () {
      if (!trascina) return; trascina = false;
      if (S.y > 110 || vy > 650) menu(false, false);
      else { ST.y = 0; avviaPannello(); }
    };
    pnTesta.addEventListener("pointerup", fineTrascina); pnTesta.addEventListener("pointercancel", fineTrascina);
    var sA = $("sent-a"), sB = $("sent-b");
    var focalizzabili = function () { return tutti("a[href], button", pannello).filter(function (x) { return x.offsetParent !== null; }); };
    if (sA) sA.addEventListener("focus", function () { if (aperto) { var c = focalizzabili(); if (c.length) c[c.length - 1].focus({ preventScroll: true }); } });
    if (sB) sB.addEventListener("focus", function () { if (aperto) { var p = focalizzabili()[0]; if (p) p.focus({ preventScroll: true }); } });
    var soglia = window.matchMedia ? window.matchMedia("(min-width: 700px)") : null;
    if (soglia && soglia.addEventListener) soglia.addEventListener("change", function () { if (soglia.matches && aperto) menu(false, false); });
  }

  // ====================================================================================================================================
  // la guida vocale: il motore (narrazione continua) sta in guida-narrazione.js e non conosce la grafica
  // ====================================================================================================================================
  function leggiPref() { var g = window.CapomastroGuida; return g ? g.leggiPref() : null; }
  function scriviPref(v) { var g = window.CapomastroGuida; if (g) g.scriviPref(v); }
  var guida = window.CapomastroGuida ? window.CapomastroGuida.crea({}) : null;
  function attivaGuida() { if (guida) guida.attiva(); }  // solo dentro un gesto: sblocca i due elementi audio e parte il primo clip raggiunto
  function guidaVideo(parte) { if (guida) guida.video(parte); }  // un video dei tutorial suona: la guida tace
  function guidaTick() { if (guida) guida.tick(); }  // a ogni fotogramma dello scorrimento

  // ====================================================================================================================================
  // lo scorrimento: un solo ascoltatore passivo, un fotogramma per volta. Scrive variabili CSS (--hp, --sy, --pg, --odo) che muovono solo
  // trasformazioni e opacità. Non muove, non blocca e non dirotta mai lo scorrimento della pagina.
  // ====================================================================================================================================
  var eroe = document.querySelector(".eroe"), rafScroll = 0;
  var corsa = $("percorso"), testiPassi = tutti(".p-passo"), figPassi = tutti(".p-fig"), tacche = tutti("#p-tacche li"), odo = $("p-odo"), sigla = $("p-sigla");
  var NOMI_PASSI = testiPassi.map(function (a) { return a.getAttribute("data-nomi") || ""; });
  var scenaPassi = null, passoK = -1, corsaVista = false;
  function frame() {
    rafScroll = 0;
    var y = window.pageYOffset, vh = window.innerHeight, doc = document.documentElement;
    // eroe: la finestra si raddrizza e sale; l'avanzamento della pagina è il filo dell'isola
    if (eroe) {
      var rE = eroe.getBoundingClientRect();
      eroe.style.setProperty("--hp", clamp(1 - (-rE.top) / (rE.height * 0.7), 0, 1).toFixed(3));
      eroe.style.setProperty("--sy", clamp(-rE.top / rE.height, 0, 1).toFixed(3));
    }
    if (filo) filo.parentNode.parentNode.style.setProperty("--pg", clamp(y / Math.max(1, doc.scrollHeight - vh), 0, 1).toFixed(4));
    // il percorso: il passo attivo è l'ultimo il cui blocco ha superato il 62 % dell'altezza
    if (corsa && testiPassi.length) {
      var rc = corsa.getBoundingClientRect(), dentro = rc.top < vh && rc.bottom > 0;
      var k = 0, i, rt;
      for (i = 0; i < testiPassi.length; i++) { rt = testiPassi[i].getBoundingClientRect(); if (rt.top < vh * 0.62) k = i; }
      if (rc.top > vh * 0.5) k = 0;
      vaiPasso(k);
      if (scenaPassi && dentro) {  // la scena gira piano con lo scorrimento (l'equivalente del tilt sul tocco)
        var rk = testiPassi[k].getBoundingClientRect(), f = clamp((vh * 0.62 - rk.top) / Math.max(1, rk.height), 0, 1), b = SC.STATI.passi[k];
        scenaPassi.imposta({ yaw: b.yaw + (f - 0.5) * 7, pit: b.pit + (f - 0.5) * -2 });
      }
      if (dentro !== corsaVista) { corsaVista = dentro; if (scenaPassi) scenaPassi.visibile(dentro); videoPassi(); }
    }
    calcolaSezione(vh);
    aggiornaCond(y);
    guidaTick();  // la narrazione, se tace, riparte dal primo clip non ascoltato e già raggiunto
  }
  function richiediFrame() { if (!rafScroll) rafScroll = requestAnimationFrame(frame); }
  window.addEventListener("scroll", richiediFrame, { passive: true });
  window.addEventListener("resize", function () { posizionaLente(true); richiediFrame(); });
  window.addEventListener("orientationchange", richiediFrame);

  // ====================================================================================================================================
  // il percorso: un passo alla volta cambiano il testo, il video dell'app e lo stato della scena
  // ====================================================================================================================================
  function vaiPasso(k) {
    if (k === passoK) return;
    passoK = k; passoCorrente = k;
    testiPassi.forEach(function (a, i) { a.classList.toggle("attivo", i === k); });
    figPassi.forEach(function (f, i) { f.classList.toggle("attivo", i === k); });
    tacche.forEach(function (t, i) { t.classList.toggle("attivo", i === k); t.classList.toggle("fatto", i < k); });
    if (odo) odo.style.setProperty("--odo", k);
    if (sigla) sigla.textContent = (NOMI_PASSI[k] || "").split(" · ")[0];
    if (scenaPassi) scenaPassi.imposta(SC.STATI.passi[k]);
    videoPassi();
    scriviStato();
  }
  function avviaPercorso() {
    var cv = $("p-canvas");
    if (!cv || !SC) return;
    scenaPassi = creaScena("passi", cv, { tilt: true }, SC.STATI.passi[0]);
    if (scenaPassi) { scenaPassi.imposta(SC.STATI.passi[Math.max(0, passoK)], quieto); }
    richiediFrame();
  }

  // ====================================================================================================================================
  // i video in loop dell'app vera: muti, caricati solo quando servono e fermi fuori schermo (risparmio dati e movimento ridotto: solo la locandina)
  // ====================================================================================================================================
  var risparmio = !!(navigator.connection && navigator.connection.saveData);
  var puoVideo = !quieto && !risparmio;
  function caricaVideo(v) { if (!v.getAttribute("src") && v.getAttribute("data-src")) { v.preload = "auto"; v.src = v.getAttribute("data-src"); } }
  function suonaVideo(v) { var p = v.play(); if (p && p.catch) p.catch(function () { /* risparmio energia o niente gesto: resta la locandina */ }); }
  function scaricaVideo(v) { try { v.pause(); } catch (e) { /* già fermo */ } if (v.getAttribute("src")) { v.removeAttribute("src"); try { v.load(); } catch (e2) { /* niente */ } } }
  function locandinaVideo(v) { if (!v.getAttribute("poster") && v.getAttribute("data-poster")) v.poster = v.getAttribute("data-poster"); }
  function videoPassi() {
    if (!figPassi.length || passoK < 0) return;
    figPassi.forEach(function (f, i) {
      var v = f.querySelector("video"); if (!v) return;
      var d = Math.abs(i - passoK);
      if (d <= 1) locandinaVideo(v);  // la locandina del passo e dei suoi vicini: l'immagine che si vede prima che il video parta (o sempre, con il risparmio dati)
      if (!puoVideo) return;
      if (i === passoK && corsaVista && !document.hidden) { caricaVideo(v); suonaVideo(v); }
      else if (d <= 1) { caricaVideo(v); try { v.pause(); } catch (e) { /* già fermo */ } }
      else scaricaVideo(v);
    });
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) tutti("video.loop").forEach(function (v) { try { v.pause(); } catch (e) { /* già fermo */ } }); else { videoPassi(); eroeVideoVista(); } });
  var evid = $("eroe-video"), evVisto = false;
  function eroeVideoVista() { if (!evid || !puoVideo) return; if (evVisto && !document.hidden) { caricaVideo(evid); suonaVideo(evid); } else { try { evid.pause(); } catch (e) { /* già fermo */ } } }
  if (evid && osserva) new IntersectionObserver(function (v) { evVisto = v[0].isIntersecting; eroeVideoVista(); }, { threshold: 0.15 }).observe(evid);
  else if (evid) { evVisto = true; eroeVideoVista(); }

  // ====================================================================================================================================
  // video tutorial: media/tutorial/tutorial.json (titolo, file, locandina, durata, capitoli, novità)
  // ====================================================================================================================================
  // Un video alla volta; i capitoli portano il video al loro tempo (mai lo scorrimento della pagina). Un tutorial senza
  // file (o con il file non ancora pubblicato) è «in arrivo»: nessun collegamento rotto, e si completa da solo appena c'è.
  // Sotto il lettore, le novità del modulo (un video breve ciascuna, dal più recente). Gli indirizzi diretti #novita-<id> e
  // #tutorial-<id> portano al lettore con lo scorrimento del browser (ogni id ha la sua ancora fissa in cima al lettore, già nell'HTML:
  // lo script non scorre mai la pagina) e lo script sceglie il video: mai un avvio, mai la guida vocale.
  var CARTELLA_TUTORIAL = "media/tutorial/";
  var schede = $("tutorial-schede"), corpoTut = $("lettore-tutorial");
  var elenco = [], scelto = 0, video = null;
  var sceltaNovita = -1;  // -1 = il tutorial completo; altrimenti la novità del modulo scelto nel lettore
  var cartaNovita = [];   // i collegamenti della lista delle novità, per segnare quella nel lettore senza ridisegnarli
  var MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  var RE_NOVITA = /^#novita-([a-z0-9]+(?:-[a-z0-9]+)*)$/, RE_TUTORIAL = /^#tutorial-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

  function el(tag, classe, testo) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (testo != null) e.textContent = testo;
    return e;
  }
  function tempo(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function durataTesto(sec) {
    if (!sec) return "";
    var m = Math.round(sec / 60);
    return m < 1 ? "meno di un minuto" : m + (m === 1 ? " minuto" : " minuti");
  }
  function dataTesto(iso) {  // «15 novembre 2026» da 2026-11-15, senza fusi orari
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso || "");
    return m ? parseInt(m[3], 10) + " " + MESI[parseInt(m[2], 10) - 1] + " " + m[1] : "";
  }
  function ordinaNovita(a, b) {  // dal più recente; a parità di data, i video della stessa versione nell'ordine di «ordine»
    if ((a.data || "") !== (b.data || "")) return (a.data || "") < (b.data || "") ? 1 : -1;
    return (a.ordine || 0) - (b.ordine || 0);
  }
  function corrente() {  // il video nel lettore: il tutorial completo o una novità disponibile del modulo
    var t = elenco[scelto], n = sceltaNovita >= 0 && t.novita ? t.novita[sceltaNovita] : null;
    return n && n.disponibile ? n : t;
  }
  // il cambio di video con una transizione fra le due schermate dove il browser le sa fare (View Transitions), altrimenti subito
  function transizione(fn) {
    if (!quieto && document.startViewTransition) {
      try { document.startViewTransition(fn); return; } catch (e) { /* ripiego sotto */ }
    }
    fn();
  }
  function fermaVideo() {
    if (!video) return;
    try { video.pause(); video.removeAttribute("src"); video.load(); } catch (e) { /* già scarico */ }
    video = null;
  }
  function vai(t) {
    if (!video) return;
    var parti = function () {
      video.currentTime = t;
      var p = video.play();
      if (p && p.catch) p.catch(function () { video.controls = true; });
    };
    if (video.readyState >= 1) parti();
    else { video.addEventListener("loadedmetadata", parti, { once: true }); video.preload = "metadata"; video.load(); }
  }
  // un manuale d'uso per modulo (23/11/2026): il tutorial di un modulo rimanda al manuale di quel modulo (id come in tutorial.json)
  var MANUALI = {
    "soffitti-radianti": { file: "documenti/Manuale_utente_Capomastro_Soffitti_radianti.pdf", nome: "Soffitti radianti" },
    "cartongesso": { file: "documenti/Manuale_utente_Capomastro_Cartongesso.pdf", nome: "Cartongesso" }
  };
  function manualeDi(id) { return MANUALI[id] || MANUALI["soffitti-radianti"]; }
  function linkManuale(id, testo) {
    var m = manualeDi(id), a = document.createElement("a");
    a.href = m.file; a.className = "link-testo"; a.textContent = testo || ("Manuale d'uso · " + m.nome);
    return a;
  }
  function disegna() {
    var t = elenco[scelto], v = corrente(), novita = v !== t;
    fermaVideo();
    corpoTut.textContent = "";
    corpoTut.removeAttribute("aria-busy");
    var colonna = el("div");
    var figura = el("figure", "tutorial-video");
    figura.style.margin = "0";
    var finestra = el("div", "finestra");
    var barretta = el("div", "barretta");
    barretta.setAttribute("aria-hidden", "true");
    barretta.appendChild(el("i")); barretta.appendChild(el("i")); barretta.appendChild(el("i"));
    barretta.appendChild(el("span", "", "Capomastro · " + t.titolo + (novita ? " · novità " + v.versione : " · esempio «Mario Rossi»")));
    finestra.appendChild(barretta);
    if (v.disponibile) {
      video = document.createElement("video");
      video.controls = true; video.preload = "none"; video.setAttribute("playsinline", "");
      if (v.locandina) video.poster = CARTELLA_TUTORIAL + v.locandina;
      video.setAttribute("aria-label", novita ? "Novità della versione " + v.versione + ": " + v.titolo : "Tutorial «" + t.titolo + "»");
      video.src = CARTELLA_TUTORIAL + v.file;
      if (v.sottotitoli) {
        var traccia = document.createElement("track");
        traccia.kind = "subtitles"; traccia.srclang = "it"; traccia.label = "Italiano"; traccia.src = CARTELLA_TUTORIAL + v.sottotitoli;
        video.appendChild(traccia);
      }
      // la guida vocale tace mentre il video suona
      video.addEventListener("play", function () { guidaVideo(true); });
      video.addEventListener("pause", function () { guidaVideo(false); });
      video.addEventListener("ended", function () { guidaVideo(false); });
      finestra.appendChild(video);
    } else {
      var segnaposto = el("div", "segnaposto");
      var testo = el("div", "", "Il tutorial del modulo " + t.titolo + " è in arrivo");
      var intanto = el("small", "", "Nel frattempo trovi tutti i passi, con le schermate, nel ");
      intanto.appendChild(linkManuale(t.id, "manuale d'uso del modulo " + manualeDi(t.id).nome));
      intanto.appendChild(document.createTextNode("."));
      testo.appendChild(intanto);
      segnaposto.appendChild(testo);
      finestra.appendChild(segnaposto);
    }
    figura.appendChild(finestra);
    colonna.appendChild(figura);
    var testa = el("div", "tutorial-testa");
    if (novita) {
      testa.appendChild(el("h3", "", v.titolo));
      testa.appendChild(el("div", "durata", "Novità della versione " + v.versione + " · " + dataTesto(v.data) + " · Durata: " + tempo(v.durata)));
      if (v.descrizione) testa.appendChild(el("p", "", v.descrizione));
      var torna = el("button", "pulsante piccolo torna", "Torna al tutorial completo");
      torna.type = "button";
      torna.addEventListener("click", function () { sceltaNovita = -1; transizione(function () { disegna(); segnaNovita(); }); });
      testa.appendChild(torna);
    } else {
      testa.appendChild(el("h3", "", "Soffitti radianti" === t.titolo || "Cartongesso" === t.titolo ? "Capomastro · " + t.titolo : t.titolo));
      var d = durataTesto(t.durata);
      testa.appendChild(el("div", "durata", t.disponibile ? (d ? "Durata: " + d : "Video tutorial") : "In arrivo"));
      if (t.descrizione) testa.appendChild(el("p", "", t.descrizione));
      if (t.disponibile && t.girato_su) {
        var seguono = (t.novita || []).some(function (n) { return n.disponibile; });
        testa.appendChild(el("p", "girato-su", "Girato sulla versione " + t.girato_su + (seguono ? ": le novità successive sono nei video qui sotto." : ".")));
      }
      // il manuale in PDF dello stesso modulo, con gli stessi passi e le schermate
      var pm = el("p", "manuale-del-modulo");
      pm.appendChild(linkManuale(t.id));
      testa.appendChild(pm);
    }
    colonna.appendChild(testa);
    corpoTut.appendChild(colonna);

    var lista = el("div", "capitoli");
    lista.appendChild(el("h4", "", "Capitoli"));
    var capitoli = v.disponibile ? (v.capitoli || []) : [];
    if (capitoli.length) {
      var ol = document.createElement("ol");
      var voci = capitoli.map(function (c) {
        var li = document.createElement("li");
        var b = document.createElement("button");
        b.type = "button";
        b.appendChild(el("span", "tc", tempo(c.inizio)));
        b.appendChild(el("span", "", c.titolo));
        b.addEventListener("click", function () { vai(c.inizio); });
        li.appendChild(b); ol.appendChild(li);
        return b;
      });
      lista.appendChild(ol);
      var attivo = -1;
      video.addEventListener("timeupdate", function () {
        var ora = video.currentTime, k = -1;
        for (var n = 0; n < capitoli.length; n++) if (capitoli[n].inizio <= ora + 0.25) k = n;
        if (k === attivo) return;
        if (attivo >= 0) voci[attivo].removeAttribute("aria-current");
        attivo = k;
        if (k >= 0) {
          voci[k].setAttribute("aria-current", "true");
          // solo la lista dei capitoli si muove, mai la pagina; non se la stai usando con il mouse
          if (!lista.matches(":hover")) lista.scrollTop = Math.max(0, voci[k].offsetTop - lista.clientHeight / 2 + voci[k].offsetHeight / 2);
        }
      });
    } else {
      var vuoto = el("p", "vuoto");
      vuoto.appendChild(document.createTextNode(v.disponibile ? "Questo video non ha capitoli: scorri la barra del lettore." : "I capitoli compariranno con il video. Intanto, "));
      if (!v.disponibile) {
        var a = document.createElement("a");
        a.href = manualeDi(t.id).file; a.textContent = "apri il manuale d'uso del modulo " + manualeDi(t.id).nome;
        vuoto.appendChild(a); vuoto.appendChild(document.createTextNode("."));
      }
      lista.appendChild(vuoto);
    }
    corpoTut.appendChild(lista);
  }

  // --- novità del modulo scelto: una carta per video, dal più recente ------------------------------------------------
  function segnaNovita() {  // la carta della novità nel lettore (senza ridisegnare le carte: il clic in corso non le tocca)
    cartaNovita.forEach(function (c, i) {
      if (i === sceltaNovita) c.setAttribute("aria-current", "true"); else c.removeAttribute("aria-current");
    });
  }
  function disegnaNovita() {
    var contenitore = $("novita-lista"), nome = $("novita-modulo"), t = elenco[scelto];
    if (!contenitore) return;
    contenitore.textContent = "";
    cartaNovita = [];
    if (nome && t) nome.textContent = t.titolo;
    var voci = (t && t.novita) || [];
    if (!voci.length) {
      var vuota = el("div", "novita-vuota");
      vuota.appendChild(el("span", "tag", "in arrivo"));
      vuota.appendChild(el("span", "", "Le novità del modulo " + (t ? t.titolo : "") + " arriveranno qui: un video breve per ogni funzione importante."));
      contenitore.appendChild(vuota);
      return;
    }
    voci.forEach(function (n, i) {
      var carta;
      if (n.disponibile) {
        carta = document.createElement("a");
        // il salto al lettore è il collegamento stesso (l'ancora #novita-<id> sta in cima al lettore), non lo script
        carta.href = $("novita-" + n.id) ? "#novita-" + n.id : "#tutorial-app";
        carta.addEventListener("click", function () { sceltaNovita = i; transizione(function () { disegna(); segnaNovita(); }); });
      } else {
        carta = document.createElement("div");
      }
      carta.className = "novita-carta" + (n.disponibile ? "" : " in-arrivo");
      var miniatura = el("div", "miniatura");
      if (n.disponibile) {
        if (n.locandina) {
          var img = document.createElement("img");
          img.src = CARTELLA_TUTORIAL + n.locandina; img.alt = ""; img.width = 1280; img.height = 720;
          img.loading = "lazy"; img.decoding = "async";
          miniatura.appendChild(img);
        }
        if (i === 0) miniatura.appendChild(el("span", "nuovo", "Più recente"));
        miniatura.appendChild(el("span", "minuti", tempo(n.durata)));
        var gioca = el("span", "gioca");
        gioca.setAttribute("aria-hidden", "true");
        gioca.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        miniatura.appendChild(gioca);
      } else {
        miniatura.appendChild(el("span", "", "In arrivo"));
      }
      carta.appendChild(miniatura);
      var testo = el("div", "corpo");
      testo.appendChild(el("div", "quando", "Versione " + n.versione + (dataTesto(n.data) ? " · " + dataTesto(n.data) : "")));
      testo.appendChild(el("h4", "", n.titolo));
      if (n.descrizione) testo.appendChild(el("p", "", n.descrizione));
      carta.appendChild(testo);
      if (n.disponibile) carta.setAttribute("aria-label", "Guarda la novità della versione " + n.versione + ": " + n.titolo + ", " + tempo(n.durata));
      contenitore.appendChild(carta);
      cartaNovita.push(carta);
    });
    segnaNovita();
  }
  function scegliModulo(i, conFocus) {
    scelto = i; sceltaNovita = -1;
    transizione(function () {
      schedeTutorial(); disegna(); disegnaNovita();
      if (conFocus) { var s = schede.querySelector('[aria-selected="true"]'); if (s) s.focus({ preventScroll: true }); }
    });
  }
  function schedeTutorial() {
    schede.textContent = "";
    elenco.forEach(function (t, i) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", i === scelto ? "true" : "false");
      b.tabIndex = i === scelto ? 0 : -1;
      b.appendChild(document.createTextNode(t.titolo));
      if (!t.disponibile) b.appendChild(el("span", "tag", "in arrivo"));
      b.addEventListener("click", function () {
        if (i === scelto) return;
        scegliModulo(i, true);
      });
      b.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        scegliModulo((scelto + d + elenco.length) % elenco.length, true);
      });
      schede.appendChild(b);
    });
  }
  // l'indirizzo con un'ancora di questo tipo sceglie il video nel lettore; un id sconosciuto lascia la sezione com'è
  function ancoraVoluta() {
    var h = location.hash || "", m = RE_NOVITA.exec(h), i, j;
    if (m && m[1] !== "3-0") {
      for (i = 0; i < elenco.length; i++) {
        var nv = elenco[i].novita || [];
        for (j = 0; j < nv.length; j++) if (nv[j].id === m[1]) return { i: i, j: j };
      }
      return null;
    }
    m = RE_TUTORIAL.exec(h);
    if (m) {
      var k = elenco.findIndex(function (t) { return t.id === m[1]; });
      if (k >= 0) return { i: k, j: -1 };
    }
    return null;
  }
  function applicaAncora() {
    var a = ancoraVoluta();
    if (!a) return false;
    if (a.i === scelto && a.j === sceltaNovita) return true;
    scelto = a.i; sceltaNovita = a.j;
    transizione(function () { schedeTutorial(); disegna(); disegnaNovita(); });
    return true;
  }
  window.addEventListener("hashchange", function () { if (elenco.length) applicaAncora(); });
  function esiste(url) {  // il file c'è davvero? (un tutorial annunciato nel JSON ma non ancora pubblicato è «in arrivo»)
    return fetch(url, { method: "HEAD", cache: "no-store" }).then(function (r) { return r.ok; }, function () { return false; });
  }
  function disponibile(voce) {  // pubblicato = nel JSON ci sono file e durata (le scrive tools/sito.py); si controlla anche che il file ci sia
    return (voce.file && voce.durata ? esiste(CARTELLA_TUTORIAL + voce.file) : Promise.resolve(false)).then(function (ok) { voce.disponibile = ok; return voce; });
  }
  if (schede && corpoTut) {
    corpoTut.setAttribute("aria-busy", "true");
    fetch(CARTELLA_TUTORIAL + "tutorial.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("tutorial.json")); })
      .then(function (dati) {
        var voci = (dati && dati.tutorial) || [];
        return Promise.all(voci.map(function (t) {
          return disponibile(t).then(function () {
            // le novità del modulo: «video» è il suo file; più recenti per prime
            return Promise.all((t.novita || []).map(function (n) { n.file = n.video; return disponibile(n); }));
          }).then(function (novita) { t.novita = novita.sort(ordinaNovita); return t; });
        }));
      })
      .then(function (voci) {
        elenco = voci;
        if (!elenco.length) throw new Error("nessun tutorial");
        // un tutorial disponibile per primo, salvo un'ancora (#tutorial-cartongesso, #novita-moduli-e-circuiti-a-mano) che sceglie il video
        scelto = Math.max(0, elenco.findIndex(function (t) { return t.disponibile; }));
        var a = ancoraVoluta();
        if (a) { scelto = a.i; sceltaNovita = a.j; }
        schedeTutorial(); disegna(); disegnaNovita();
      })
      .catch(function () {
        corpoTut.textContent = "";
        corpoTut.removeAttribute("aria-busy");
        corpoTut.appendChild(el("p", "rete", "I video tutorial non si caricano in questo momento: riprova fra poco. Nei manuali d'uso (uno per modulo) trovi gli stessi passi con le schermate."));
      });
  }

  // ====================================================================================================================================
  // il puntatore (solo mouse e trackpad): pulsanti magnetici, finestra e schede che si inclinano verso il cursore, scia di luce.
  // Il tocco ha già le sue risposte: la rotazione della scena e della finestra nasce dallo scorrimento.
  // ====================================================================================================================================
  if (fine && !quieto) {
    var magneti = tutti(".magnetico"), richiesta = 0, px = 0, py = 0;
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      px = e.clientX; py = e.clientY;
      if (richiesta) return;
      richiesta = requestAnimationFrame(function () {
        richiesta = 0;
        magneti.forEach(function (m) {
          var r = m.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy), raggio = Math.max(r.width, 120) * 0.9;
          if (d < raggio) { m.style.setProperty("--mx", (dx * 0.22).toFixed(1) + "px"); m.style.setProperty("--my", (dy * 0.3).toFixed(1) + "px"); }
          else { m.style.setProperty("--mx", "0px"); m.style.setProperty("--my", "0px"); }
        });
        if (eroe) {  // la finestra dell'eroe guarda il cursore e la luce la segue
          var re = eroe.getBoundingClientRect();
          if (re.bottom > 0 && re.top < innerHeight) {
            var u = clamp((px / innerWidth - 0.5) * 2, -1, 1), v = clamp((py / innerHeight - 0.5) * 2, -1, 1);
            eroe.style.setProperty("--inclx", (u * 3.2).toFixed(2) + "deg"); eroe.style.setProperty("--incly", (-v * 2.4).toFixed(2) + "deg");
            eroe.style.setProperty("--lux", (30 + u * 28).toFixed(1) + "%"); eroe.style.setProperty("--luy", (14 + v * 20).toFixed(1) + "%");
          }
        }
      });
    }, { passive: true });
    // le schede dei piani e le carte si inclinano di pochi gradi
    tutti(".piano, .carta, .documento").forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse") return;
        var r = c.getBoundingClientRect(), u = (e.clientX - r.left) / r.width - 0.5, v = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = "perspective(900px) rotateY(" + (u * 7).toFixed(2) + "deg) rotateX(" + (-v * 7).toFixed(2) + "deg) translateZ(0)";
      });
      c.addEventListener("pointerleave", function () { c.style.transform = ""; });
    });
    // la scia: una linea sottile di luce che segue il cursore e svanisce
    var scia = document.createElement("canvas"), sx = scia.getContext("2d"), punti = [], sraf = 0;
    scia.setAttribute("aria-hidden", "true");
    scia.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:150;";
    document.body.appendChild(scia);
    function misuraScia() { scia.width = innerWidth * Math.min(2, devicePixelRatio || 1); scia.height = innerHeight * Math.min(2, devicePixelRatio || 1); }
    misuraScia(); window.addEventListener("resize", misuraScia);
    function disegnaScia() {
      sraf = 0;
      var d = Math.min(2, devicePixelRatio || 1), t = adesso(), i, a, b, col = getComputedStyle(html).getPropertyValue("--ciano").trim() || "#12c8f0";
      sx.setTransform(d, 0, 0, d, 0, 0); sx.clearRect(0, 0, innerWidth, innerHeight);
      punti = punti.filter(function (p) { return t - p.t < 520; });
      sx.lineCap = "round"; sx.lineJoin = "round"; sx.strokeStyle = col;
      for (i = 1; i < punti.length; i++) {
        a = punti[i - 1]; b = punti[i];
        var q = 1 - (t - b.t) / 520;
        sx.globalAlpha = Math.max(0, q) * 0.5; sx.lineWidth = 0.6 + q * 2.4;
        sx.beginPath(); sx.moveTo(a.x, a.y); sx.lineTo(b.x, b.y); sx.stroke();
      }
      if (punti.length > 1) sraf = requestAnimationFrame(disegnaScia);
    }
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || document.hidden) return;
      punti.push({ x: e.clientX, y: e.clientY, t: adesso() });
      if (punti.length > 40) punti.shift();
      if (!sraf) sraf = requestAnimationFrame(disegnaScia);
    }, { passive: true });
  }

  // ====================================================================================================================================
  // pagina di caricamento e entrata dell'eroe
  // ====================================================================================================================================
  // Con html.carica (la mette lo script in testa: solo senza movimento ridotto, senza ancora e alla prima visita della sessione) la pianta del
  // progetto d'esempio si disegna e si accende, il contatore sale, il marchio si disegna, poi due scelte. «Entra con la guida» è il gesto che
  // sblocca l'audio; un tocco altrove, un tasto o la rotella entrano in silenzio. La tenda si apre sulla pagina e il titolo entra per parole.
  var car = $("caricamento"), entrato = false;
  function avviaEroe() {
    if (html.classList.contains("entrato")) return;
    html.classList.add("entrato");
    costruisciEroe();
    richiediFrame();
  }
  function inerteAlCaricamento(v) { [document.querySelector("main"), document.querySelector("header"), document.querySelector("footer")].forEach(function (e) { inerte(e, v); }); }
  function entra(conGuida) {
    if (entrato) return;
    entrato = true;
    try { sessionStorage.setItem("cm-visto", "1"); } catch (e) { /* archivio non disponibile */ }
    if (conGuida) attivaGuida();  // dentro il gesto: sblocca i due elementi audio e parte il primo clip
    html.classList.add("apre");
    inerteAlCaricamento(false);
    setTimeout(function () { avviaEroe(); }, 420);
    setTimeout(function () { html.classList.remove("carica", "apre", "car-pronto"); richiediFrame(); guidaTick(); }, 1300);
  }
  if (car && html.classList.contains("carica")) {
    inerteAlCaricamento(true);
    var btnGuida = $("entra-guida"), btnSilenzio = $("entra-silenzio"), conta = $("car-n"), linea = car.querySelector(".car-linea");
    var caricata = document.readyState === "complete", fontPronti = !(document.fonts && document.fonts.ready), t0 = null, pronto = false, scena = null;
    if (!caricata) window.addEventListener("load", function () { caricata = true; });
    if (!fontPronti) document.fonts.ready.then(function () { fontPronti = true; }, function () { fontPronti = true; });
    var mostraScelte = function () {
      if (pronto) return;
      pronto = true;
      car.classList.add("car-pronto");
      html.classList.add("car-pronto");  // anche sulla pagina: lo guardano le prove dall'esterno e la rete di sicurezza
      if (conta) conta.textContent = "100";
      if (btnGuida && guida && !guida.pronta()) { /* la guida arriva a momenti: il pulsante resta, attiva appena può */ }
      setTimeout(function () { try { (btnGuida || btnSilenzio).focus({ preventScroll: true }); } catch (e) { /* senza focus */ } }, 700);
    };
    // la scena del caricamento: tappe nel tempo (ms): contorni, struttura, moduli, circuiti, poi il marchio
    datiScena().then(function (d) {
      if (!d || !SC) return;
      scena = creaScena("car", $("car-scena"), { luce: false, tilt: false }, SC.stato({ yaw: 38, pit: 36, zm: innerWidth > 900 ? 1.3 : 1.02 }));
      if (!scena) return;
      scena.visibile(true);
      [[0, { c: 1 }], [700, { st: 1, ex: 0.3 }], [1250, { md: 1, ex: 0.55 }], [1850, { tb: 1, co: 1, ex: 0.7, yaw: 44 }], [2500, { ce: 1, rg: 1, ex: 0.9 }]].forEach(function (tp) { setTimeout(function () { if (scena) scena.imposta(tp[1]); }, tp[0]); });
    });
    var tick = function (ts) {
      if (entrato) return;
      if (t0 === null) t0 = ts;
      var q = clamp((ts - t0) / 3000, 0, 1), e = 1 - Math.pow(1 - q, 3);
      var tetto = caricata && fontPronti ? 1 : 0.92;
      var n = Math.round(Math.min(e, tetto) * 100);
      if (conta && !pronto) conta.textContent = String(n);
      if (linea) car.style.setProperty("--car-p", Math.min(e, tetto).toFixed(3));
      if (q > 0.74 && !car.classList.contains("logo")) { car.classList.add("logo"); setTimeout(function () { car.classList.add("fatto"); }, 380); }
      if (q >= 1 && caricata && fontPronti) { mostraScelte(); return; }
      requestAnimationFrame(tick);
    };
    var avvia = function () { requestAnimationFrame(tick); };
    if (btnGuida) btnGuida.addEventListener("click", function () { entra(true); });
    if (btnSilenzio) btnSilenzio.addEventListener("click", function () { scriviPref("no"); entra(false); });
    car.addEventListener("pointerdown", function (e) { if (!(e.target.closest && e.target.closest("button"))) entra(false); });
    document.addEventListener("keydown", function (e) { if (!entrato && (e.key === "Escape" || e.key === " ")) { entra(false); } });
    window.addEventListener("wheel", function () { if (pronto) entra(false); }, { passive: true });
    // rete di sicurezza: se qualcosa tarda le scelte compaiono comunque
    setTimeout(function () { if (!entrato) mostraScelte(); }, 7500);
    requestAnimationFrame(function () { requestAnimationFrame(avvia); });
  } else {
    requestAnimationFrame(function () { requestAnimationFrame(avviaEroe); });
  }

  // ---- avvio ------------------------------------------------------------------------------------------------------------------------
  avviaScene();
  window.__cm.vaiPasso = vaiPasso;
  window.__cm.scene = sceneInst;
  window.__cm.tema = cambiaTema;
  window.__cm.entra = entra;
  richiediFrame();
})();
