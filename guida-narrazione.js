/*
 * Guida vocale di Capomastro: la narrazione continua della pagina pubblica. Non conosce la grafica: si appoggia a tre cose e basta, così
 * può stare sotto qualunque veste della pagina.
 *
 *   1. Gli elementi con l'attributo  data-guida="<id>"  (in ordine di pagina); ogni <id> ha il suo clip in media/guida/guida.json.
 *   2. Un pulsante (di serie  #g-muto ) con aria-pressed, che accende e spegne la voce; mentre la voce parla riceve data-parla="1"
 *      (serve a un piccolo indicatore che si anima solo allora). Il pulsante parte con  hidden  e si mostra quando la guida è pronta.
 *   3. media/guida/guida.json:  { "clip": [ { "id", "file", "durata", "testo" }, ... ] }  nell'ordine della pagina (la scaletta)  e
 *      media/guida/<id>.m4a.
 *
 * Uso:
 *   var guida = CapomastroGuida.crea({
 *     cartella: "media/guida/",                 // facoltativo
 *     bottone: "#g-muto",                       // selettore o elemento, facoltativo
 *     stato: function (id, elemento) { ... }    // facoltativo: per un elemento «speciale» (per esempio i passi di una scena fissa) dice
 *   });                                         //   { raggiunto: bool, superato: bool }; undefined = misura la posizione dell'elemento
 *   guida.attiva();     // SOLO dentro un gesto dell'utente (tocco, clic): sblocca i due elementi audio e parte dal primo clip raggiunto
 *   guida.spegni();     // muto: breve dissolvenza (dove il browser lo permette) e ferma tutto
 *   guida.tick();       // da chiamare a ogni fotogramma dello scorrimento: se tace, parte il prossimo clip appena raggiunto
 *   guida.video(true)   // un video suona: la guida tace; guida.video(false): riprende da dove era
 *   guida.acceso(), guida.pronta()
 *
 * Il modello (una narrazione, non un clip per ogni evento di scorrimento):
 *   - I clip sono una scaletta nell'ordine di guida.json. Un clip NON si taglia mai per lo scorrimento: finisce sempre. Si ferma solo per
 *     il muto, per la scheda nascosta (riprende al ritorno) e per un video (riprende alla fine del video).
 *   - «Raggiunto» = la cima dell'elemento sopra l'80 % dell'altezza della finestra (in fondo alla pagina, dove non si scorre oltre, basta
 *     che si veda); «superato» = interamente sopra la finestra.
 *   - Alla fine di un clip il prossimo è il primo non ascoltato e già raggiunto: parte subito, nello stesso istante dell'evento ended. Se
 *     non è ancora raggiunto, parte appena entra in vista (al fotogramma successivo o quando taglia la linea dell'80 %).
 *   - Se il visitatore è molto più avanti (più di due clip non ascoltati con l'elemento già superato) si passa alla sezione che sta
 *     guardando e i saltati non si ripetono; se è avanti di uno o due si continua in ordine, per seguire il filo logico.
 *   - Tornando indietro non si rilegge niente (ogni clip si dice al più una volta, salvo il muto a metà: sotto l'80 % ricomincia).
 *   - Senza buchi: due elementi <audio> a ping-pong, il clip successivo è già caricato mentre parla il corrente. Entrambi si sbloccano nello
 *     stesso gesto (su iOS un elemento che non ha mai suonato dentro un gesto non può parlare più tardi).
 *   - Mai da sola: serve sempre un gesto, anche con il movimento ridotto. Nessun timer periodico e nessuno scorrimento della pagina.
 *   - La preferenza (localStorage, chiave cm-guida: "si" | "no") serve solo alla pagina di caricamento; non accende mai la voce da sola.
 */
(function () {
  "use strict";
  // mezzo decimo di secondo di silenzio (WAV a 8 bit): serve a sbloccare un elemento audio dentro il gesto dell'utente
  var SILENZIO = "data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";
  var CHIAVE_PREF = "cm-guida";

  function leggiPref() { try { return localStorage.getItem(CHIAVE_PREF); } catch (e) { return null; } }
  function scriviPref(v) { try { localStorage.setItem(CHIAVE_PREF, v); } catch (e) { /* archivio non disponibile */ } }
  function tutti(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function movimentoRidotto() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }

  function crea(config) {
    config = config || {};
    var CARTELLA = config.cartella || "media/guida/";
    var G = { S: [], mappa: {}, el: {}, uditi: {}, slot: null, corr: null, on: false, pronta: false, pausaVideo: false, pausaScheda: false, sblocchi: 0, fade: 0 };
    var btn = typeof config.bottone === "string" ? document.querySelector(config.bottone) : (config.bottone || document.getElementById("g-muto"));
    function urlClip(c) { return CARTELLA + String(c.file || (c.id + ".m4a")).split("/").pop(); }
    function nessunaPausa() { return G.on && !G.pausaVideo && !G.pausaScheda; }

    function impostaIcona() {
      if (!btn) return;
      btn.setAttribute("aria-pressed", G.on ? "true" : "false");
      var nome = G.on ? "Guida vocale: disattiva" : "Guida vocale: attiva";
      btn.setAttribute("aria-label", nome);
      btn.title = nome;
    }
    function aggiornaIndicatore() {  // l'indicatore si anima solo mentre la voce parla
      if (!btn) return;
      var parla = !!(G.corr && !G.corr.a.paused && !G.pausaVideo && !G.pausaScheda);
      btn.setAttribute("data-parla", parla ? "1" : "0");
    }

    function creaElementi() {
      if (G.slot) return;
      var fai = function () {
        var a = new Audio(), s = { a: a, id: null, sblocco: false };
        a.preload = "auto";
        a.addEventListener("ended", function () { if (G.corr === s) finito(s); });
        a.addEventListener("error", function () {
          if (!s.id || s.sblocco) return;  // il file del clip non c'è: si salta
          if (G.corr === s) clipPerso(s); else { G.uditi[s.id] = "saltato"; s.id = null; }
        });
        a.addEventListener("playing", aggiornaIndicatore);
        a.addEventListener("pause", aggiornaIndicatore);
        return s;
      };
      G.slot = [fai(), fai()];
    }
    function altroSlot() { return G.corr === G.slot[0] ? G.slot[1] : G.slot[0]; }

    // «raggiunto» e «superato»: dal gancio config.stato (elementi speciali) o dalla posizione dell'elemento
    function stato(id) {
      var e = G.el[id], s = config.stato ? config.stato(id, e) : undefined;
      if (s) return s;
      if (!e) return { raggiunto: false, superato: false };
      var r = e.getBoundingClientRect(), vh = window.innerHeight;
      // in fondo alla pagina non si può scorrere oltre: un elemento che non arriverà mai sopra l'80 % (il piede) vale raggiunto se si vede
      var fondo = window.pageYOffset + vh >= document.documentElement.scrollHeight - 2;
      return { raggiunto: r.top < vh * 0.8 || (fondo && r.top < vh), superato: r.bottom < 0 };
    }
    function primoNonAscoltato() {
      var cor = G.corr ? G.corr.id : null;
      for (var k = 0; k < G.S.length; k++) if (!G.uditi[G.S[k].id] && G.S[k].id !== cor) return G.S[k].id;
      return null;
    }
    // quale clip dire adesso (applica = segna come saltati quelli lasciati indietro): il primo non ascoltato e già raggiunto, in ordine
    function scegli(applica) {
      var cor = G.corr ? G.corr.id : null, da = [], st = {};
      for (var k = 0; k < G.S.length; k++) {
        var id = G.S[k].id;
        if (G.uditi[id] || id === cor) continue;
        st[id] = stato(id);
        if (!st[id].raggiunto) break;  // la scaletta segue la pagina: il primo non raggiunto ferma l'elenco
        da.push(id);
      }
      if (!da.length) return null;
      if (da.filter(function (id) { return st[id].superato; }).length <= 2) return da[0];  // avanti di uno o due clip: in ordine
      var vista = da.filter(function (id) { return !st[id].superato; });
      var scelto = vista.length ? vista[0] : da[da.length - 1];  // molto più avanti: la sezione che si sta guardando
      if (applica) for (var j = 0; j < da.length && da[j] !== scelto; j++) G.uditi[da[j]] = "saltato";
      return scelto;
    }

    function slotLibero() {
      var s = G.corr ? altroSlot() : (G.slot[0].id ? G.slot[1] : G.slot[0]);
      return s.sblocco ? null : s;
    }
    function precarica() {  // il clip successivo (in ordine di scaletta) si carica sull'altro elemento: il passaggio è immediato
      if (!G.slot || !G.on || G.pausaVideo || G.pausaScheda) return;
      var id = primoNonAscoltato();
      if (!id) return;
      for (var k = 0; k < 2; k++) if (G.slot[k].id === id) return;  // già caricato
      var s = slotLibero();
      if (!s || s === G.corr) return;
      s.id = id; s.a.src = urlClip(G.mappa[id]); s.a.preload = "auto";
      try { s.a.load(); } catch (e) { /* non ancora pronto */ }
    }
    function suona(id) {
      var c = G.mappa[id];
      if (!c) { G.uditi[id] = "saltato"; return false; }
      creaElementi();
      var s = null;
      for (var k = 0; k < 2; k++) if (G.slot[k].id === id && G.slot[k] !== G.corr) s = G.slot[k];
      if (!s) { s = G.corr ? altroSlot() : (G.slot[0].id && !G.slot[0].sblocco ? G.slot[1] : G.slot[0]); s.id = id; s.a.src = urlClip(c); }
      try { s.a.currentTime = 0; } catch (e) { /* non ancora caricato */ }
      G.corr = s;
      try { s.a.volume = 1; } catch (e2) { /* iOS: il volume non si cambia */ }
      var p = s.a.play();
      if (p && p.catch) p.catch(function (err) { rifiutato(s, err); });
      aggiornaIndicatore();
      precarica();
      return true;
    }
    function rifiutato(s, err) {
      if (G.corr !== s || (err && err.name === "AbortError")) return;
      if (err && err.name === "NotAllowedError") { G.corr = null; s.id = null; G.on = false; impostaIcona(); aggiornaIndicatore(); }  // senza gesto il browser non lascia parlare
      else clipPerso(s);
    }
    function avanza() {
      if (!nessunaPausa() || G.corr || !G.slot) return;
      var id = scegli(true);
      if (id) suona(id); else precarica();
    }
    function finito(s) {
      G.uditi[s.id] = "sentito"; s.id = null; G.corr = null;
      aggiornaIndicatore();
      avanza();  // subito, senza pause
    }
    function clipPerso(s) { G.uditi[s.id] = "saltato"; s.id = null; G.corr = null; aggiornaIndicatore(); avanza(); }

    // il gesto dell'utente sblocca i due elementi insieme: uno parte dal primo clip raggiunto, l'altro con un attimo di silenzio
    function sbloccaElemento(s) {
      G.sblocchi++; s.sblocco = true; s.id = null;
      s.a.src = SILENZIO;
      var fine = function () { s.sblocco = false; G.sblocchi--; if (!s.id) { try { s.a.pause(); } catch (e) { /* già fermo */ } } precarica(); };
      var p = s.a.play();
      if (p && p.then) p.then(fine, fine); else fine();
    }
    function azzeraElementi() {
      cancelAnimationFrame(G.fade);
      if (G.slot) G.slot.forEach(function (x) { try { x.a.pause(); x.a.volume = 1; } catch (e) { /* volume non modificabile */ } x.id = null; });
      G.corr = null;
    }
    function attiva() {
      if (!G.pronta) return;
      creaElementi();
      azzeraElementi();
      G.on = true; scriviPref("si"); impostaIcona();
      var primo = scegli(true);
      if (primo) {
        sbloccaElemento(G.slot[1]);
        var s = G.slot[0]; s.id = primo; s.a.src = urlClip(G.mappa[primo]); G.corr = s;
        var p = s.a.play();
        if (p && p.catch) p.catch(function (err) { rifiutato(s, err); });
        aggiornaIndicatore();
      } else {
        sbloccaElemento(G.slot[0]); sbloccaElemento(G.slot[1]);  // niente da dire adesso: si sbloccano e si aspetta lo scorrimento
      }
    }
    function ferma(poi) {  // breve dissolvenza dove il browser lo permette (su iOS il volume non si cambia: si ferma e basta)
      var s = G.corr;
      cancelAnimationFrame(G.fade);
      if (!s) { poi(); return; }
      var a = s.a, puoi = true, t0 = 0;
      try { a.volume = 0.5; puoi = a.volume === 0.5; a.volume = 1; } catch (e) { puoi = false; }
      if (!puoi || a.paused || movimentoRidotto()) { poi(); return; }
      var passo = function (ts) {
        if (!t0) t0 = ts;
        var q = Math.min(1, (ts - t0) / 220);
        try { a.volume = 1 - q; } catch (e2) { /* volume non modificabile */ }
        if (q < 1) G.fade = requestAnimationFrame(passo); else poi();
      };
      G.fade = requestAnimationFrame(passo);
    }
    function spegni() {
      G.on = false; scriviPref("no"); impostaIcona();
      var s = G.corr;
      if (s && s.id && s.a.duration > 0 && s.a.currentTime / s.a.duration > 0.8) G.uditi[s.id] = "sentito";  // quasi finito: non si ripete
      ferma(function () { azzeraElementi(); aggiornaIndicatore(); });
    }
    function messaInPausa() { if (G.corr) G.corr.a.pause(); aggiornaIndicatore(); }
    function ripresa() {
      if (!nessunaPausa() || !G.slot) return;
      if (G.corr) { var p = G.corr.a.play(); if (p && p.catch) p.catch(function (err) { rifiutato(G.corr, err); }); aggiornaIndicatore(); } else avanza();
    }
    function tick() {  // se tace, parte il prossimo appena raggiunto
      if (!G.pronta || !G.on || G.corr) return;
      avanza();
    }
    function video(parte) {  // mentre un video suona la guida tace; quando si ferma riprende da dove era
      G.pausaVideo = !!parte;
      if (!G.slot) return;
      if (parte) messaInPausa(); else ripresa();
    }

    function carica() {
      fetch(CARTELLA + "guida.json", { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("guida.json")); })
        .then(function (d) {
          var voci = Array.isArray(d) ? d : (d && (d.clip || d.clips)) || [];
          tutti("[data-guida]").forEach(function (e) { var id = e.getAttribute("data-guida"); if (!G.el[id]) G.el[id] = e; });
          voci.forEach(function (c) { if (c && c.id && G.el[c.id]) { G.mappa[c.id] = c; G.S.push(c); } });
          G.pronta = G.S.length > 0;
          if (!G.pronta || !btn) return;
          impostaIcona();
          btn.hidden = false;
          if ("IntersectionObserver" in window) {  // un elemento che taglia la linea dell'80 % fa ripartire la voce anche senza scorrimento
            var spia = new IntersectionObserver(function () { tick(); }, { rootMargin: "0px 0px -20% 0px" });
            G.S.forEach(function (c) { spia.observe(G.el[c.id]); });
          }
        })
        .catch(function () { /* nessuna guida: il pulsante non compare e la pagina resta com'è */ });
    }
    if (btn) {
      btn.addEventListener("click", function () { if (G.on) spegni(); else attiva(); });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) { G.pausaScheda = true; messaInPausa(); }
        else { G.pausaScheda = false; ripresa(); }
      });
      window.addEventListener("resize", tick);
      carica();
    }
    return { attiva: attiva, spegni: spegni, tick: tick, video: video, acceso: function () { return G.on; }, pronta: function () { return G.pronta; } };
  }

  window.CapomastroGuida = { crea: crea, leggiPref: leggiPref, scriviPref: scriviPref };
})();
