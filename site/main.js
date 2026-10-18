(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var root = document.documentElement;
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }
  function lang() { return root.getAttribute("lang") === "en" ? "en" : "es"; }
  function t(es, en) { return lang() === "en" ? en : es; }
  // Sin servidor PHP (p. ej. GitHub Pages): manifest.api = false
  var API = data.api !== false && location.protocol !== "file:";
  if (!API) root.classList.add("no-api");
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Idioma ---------- */
  function initLang() {
    function set(l) {
      root.setAttribute("lang", l);
      $("#lang-es").setAttribute("aria-pressed", String(l === "es"));
      $("#lang-en").setAttribute("aria-pressed", String(l === "en"));
      var ci = $("#chat-in"); if (ci) ci.placeholder = t("Escribe tu pregunta…", "Type your question…");
      store("es-lang", l);
      safe(function () { if (window.__ES_REFRESH__) window.__ES_REFRESH__(); }, "refresh");
    }
    var saved = store("es-lang");
    if (!saved) saved = (navigator.language || "es").toLowerCase().indexOf("es") === 0 ? "es" : "en";
    set(saved === "en" ? "en" : "es");
    $("#lang-es").addEventListener("click", function () { set("es"); });
    $("#lang-en").addEventListener("click", function () { set("en"); });
  }

  /* ---------- Nav sólida al hacer scroll ---------- */
  function initNav() {
    var nav = $("[data-nav]");
    function on() { nav.classList.toggle("is-solid", window.scrollY > 40); }
    on(); window.addEventListener("scroll", on, { passive: true });
  }

  /* ---------- Reveals (umbral bajo + red de seguridad) ---------- */
  function initReveals() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) return;
    root.classList.add("js-reveal");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.05, rootMargin: "0px 0px -5% 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () { els.forEach(function (el) { el.classList.add("is-in"); }); }, 3500);
  }

  /* ---------- Count-up ---------- */
  function initCount() {
    $$("[data-count-to]").forEach(function (el) {
      var to = +el.getAttribute("data-count-to"), from = +(el.getAttribute("data-count-from") || 0), t0 = null, dur = 1600;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step);
      }
      setTimeout(function () { requestAnimationFrame(step); }, 900);
    });
  }

  /* ---------- Tilt 7° máx + halo ---------- */
  function initTilt() {
    if (!fineHover) return;
    $$("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (ev) {
        var r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        el.style.setProperty("--mx", x * 100 + "%"); el.style.setProperty("--my", y * 100 + "%");
        el.style.transform = "perspective(900px) rotateY(" + ((x - .5) * 7) + "deg) rotateX(" + ((.5 - y) * 7) + "deg)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- Showcase horizontal fijado (GSAP) ---------- */
  function initShowcase() {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (!matchMedia("(min-width: 960px)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    var pin = $("[data-showcase]"), track = $("[data-track]");
    if (!pin || !track) return;
    root.classList.add("has-pin");
    function dist() { return Math.max(0, track.scrollWidth - window.innerWidth); }
    gsap.to(track, {
      x: function () { return -dist(); }, ease: "none",
      scrollTrigger: { trigger: pin, start: "top top", end: function () { return "+=" + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true }
    });
  }

  /* ---------- Estudio del evento (asistente por pasos) ---------- */
  function initWizard() {
    var wz = $("[data-wizard]"); if (!wz) return;
    var steps = $$(".wz-step", wz), prog = $$(".wz-progress li", wz);
    var st = { lat: null, lon: null, label: "", pts: [], area: null };
    var map = null, poly = null, marks = [];
    var current = 1;

    function setStatus(sel, msg, warn) { var el = $(sel); if (!el) return; el.textContent = msg || ""; el.classList.toggle("is-warn", !!warn); }
    function go(n) {
      current = n;
      steps.forEach(function (s) { var on = +s.getAttribute("data-step") === n; s.hidden = !on; s.classList.toggle("is-on", on); });
      prog.forEach(function (p, i) { p.classList.toggle("is-on", i < n); });
      if (n === 3) setTimeout(initMap, 30);
      var top = wz.getBoundingClientRect().top + window.scrollY - 90;
      if (Math.abs(window.scrollY - top) > 200) window.scrollTo({ top: top, behavior: "smooth" });
    }
    function fill(id, v) { var el = $(id); if (!el || v === null || v === undefined || v === "") return; el.value = v; el.closest(".field").classList.add("is-filled"); }

    /* Paso 1: leer documento con IA */
    var file = $("#doc-file"), drop = $("[data-drop]");
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove("is-over"); }); });
    drop.addEventListener("drop", function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) readDoc(e.dataTransfer.files[0]); });
    file.addEventListener("change", function () { if (file.files[0]) readDoc(file.files[0]); });

    function readDoc(f) {
      if (f.size > 10 * 1024 * 1024) { setStatus("[data-doc-status]", t("El archivo pasa de 10 MB. Prueba con una foto más ligera.", "The file is over 10 MB. Try a lighter photo."), true); return; }
      var manual = t("No pude leer el documento desde aquí. Llena los datos abajo, toma 30 segundos.", "I couldn't read the document from here. Fill in the details below; it takes 30 seconds.");
      if (!API) { setStatus("[data-doc-status]", manual, true); return; }
      setStatus("[data-doc-status]", t("Leyendo «" + f.name + "»…", "Reading “" + f.name + "”…"));
      shrink(f).then(function (up) {
      if (up.size > 4.5 * 1024 * 1024) { setStatus("[data-doc-status]", t("El archivo es muy pesado para leerlo aquí. Prueba con una foto o un PDF más ligero.", "The file is too heavy to read here. Try a lighter photo or PDF."), true); return; }
      var fd = new FormData(); fd.append("documento", up, up.name || f.name);
      return fetch("lector-documento.php", { method: "POST", body: fd })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok) { setStatus("[data-doc-status]", j && j.reason === "no_evento" ? t("Ese documento no parece de un evento. Llena los datos abajo.", "That doesn't look like an event document. Fill in the details below.") : manual, true); return; }
          var d = j.data || {}, got = [];
          if (d.tipo_evento) { fill("#e-tipo", d.tipo_evento); got.push(t("tipo", "type")); }
          if (d.fecha) { fill("#e-fecha", d.fecha); got.push(t("fecha", "date")); }
          if (d.invitados) { fill("#e-invitados", d.invitados); got.push(t("invitados", "guests")); }
          if (d.duracion_horas) { fill("#e-horas", d.duracion_horas); got.push(t("horas", "hours")); }
          if (d.espacio) fill("#e-espacio", d.espacio);
          if (d.direccion) { fill("#e-dir", d.direccion); got.push(t("lugar", "place")); }
          setStatus("[data-doc-status]", got.length ? t("Listo. Encontré: " + got.join(", ") + ". Revisa y completa lo que falte.", "Done. Found: " + got.join(", ") + ". Check and complete the rest.") : t("Lo leí, pero no encontré datos claros. Llénalos abajo.", "I read it but found no clear details. Fill them in below."), !got.length);
        });
      }).catch(function () { setStatus("[data-doc-status]", manual, true); });
    }

    // Reduce fotos grandes (máx. 2000 px, JPEG) antes de subirlas; PDF y HEIC pasan tal cual.
    function shrink(f) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 1.5 * 1024 * 1024 || !window.createImageBitmap) return Promise.resolve(f);
      return createImageBitmap(f).then(function (bmp) {
        var k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
        cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
        cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
        return new Promise(function (res) { cv.toBlob(function (b) { res(b ? new File([b], "documento.jpg", { type: "image/jpeg" }) : f); }, "image/jpeg", 0.85); });
      }).catch(function () { return f; });
    }

    $("[data-sample]").addEventListener("click", function () {
      var e = data.ejemplo || {};
      fill("#e-tipo", e.tipo); fill("#e-invitados", e.invitados); fill("#e-horas", e.horas); fill("#e-espacio", e.espacio); fill("#e-ambiente", e.ambiente); fill("#e-dir", e.direccion);
      st.sampleArea = e.area;
      setStatus("[data-doc-status]", t("Datos de ejemplo cargados. Cámbialos por los de tu evento cuando quieras.", "Sample data loaded. Swap in your own event details anytime."));
    });

    /* Paso 2: dirección */
    function geocode() {
      var q = $("#e-dir").value.trim(), list = $("[data-geo-results]");
      list.innerHTML = "";
      if (q.length < 4) { setStatus("[data-geo-status]", t("Escribe un poco más de la dirección.", "Type a bit more of the address."), true); return; }
      var fail = t("No pude buscar la dirección desde aquí. Sigue al siguiente paso y escribe el área a mano.", "I couldn't look up the address from here. Continue and type the area by hand.");
      if (location.protocol === "file:") { setStatus("[data-geo-status]", fail, true); return; }
      setStatus("[data-geo-status]", t("Buscando…", "Searching…"));
      var req = API ? fetch("geocode.php?q=" + encodeURIComponent(q)).then(function (r) { return r.json(); })
        : fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=mx&accept-language=" + lang() + "&q=" + encodeURIComponent(q))
            .then(function (r) { return r.json(); })
            .then(function (a) { return { results: (a || []).map(function (x) { return { label: x.display_name, lat: +x.lat, lon: +x.lon }; }) }; });
      req
        .then(function (j) {
          var res = (j && j.results) || [];
          if (!res.length) { setStatus("[data-geo-status]", t("No encontré ese lugar. Prueba con calle y ciudad.", "Couldn't find that place. Try street and city."), true); return; }
          setStatus("[data-geo-status]", t("Elige el lugar correcto:", "Pick the right place:"));
          res.forEach(function (r, i) {
            var li = document.createElement("li"), b = document.createElement("button");
            b.type = "button"; b.textContent = r.label; b.setAttribute("aria-pressed", "false");
            b.addEventListener("click", function () {
              $$("button", list).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
              b.setAttribute("aria-pressed", "true");
              st.lat = r.lat; st.lon = r.lon; st.label = r.label; clearPoly();
              if (map) map.setView([r.lat, r.lon], 19);
              setStatus("[data-geo-status]", t("Ubicación lista.", "Location set."));
            });
            li.appendChild(b); list.appendChild(li);
            if (i === 0) b.click();
          });
        })
        .catch(function () { setStatus("[data-geo-status]", fail, true); });
    }
    $("[data-geo]").addEventListener("click", geocode);
    $("#e-dir").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); geocode(); } });

    /* Paso 3: mapa + polígono */
    function areaM2(pts) {
      if (pts.length < 3) return 0;
      var lat0 = pts.reduce(function (s, p) { return s + p[0]; }, 0) / pts.length * Math.PI / 180, R = 6371008.8, sum = 0;
      var xy = pts.map(function (p) { return [p[1] * Math.PI / 180 * R * Math.cos(lat0), p[0] * Math.PI / 180 * R]; });
      for (var i = 0; i < xy.length; i++) { var j = (i + 1) % xy.length; sum += xy[i][0] * xy[j][1] - xy[j][0] * xy[i][1]; }
      return Math.abs(sum) / 2;
    }
    function redraw() {
      if (!map) return;
      if (poly) map.removeLayer(poly);
      marks.forEach(function (m) { map.removeLayer(m); }); marks = [];
      st.pts.forEach(function (p) { marks.push(L.circleMarker(p, { radius: 5, color: "#EEF2EC", weight: 2, fillColor: "#3DBE8B", fillOpacity: 1 }).addTo(map)); });
      if (st.pts.length >= 2) poly = L.polygon(st.pts, { color: "#3DBE8B", weight: 2, fillColor: "#3DBE8B", fillOpacity: .25 }).addTo(map);
      st.area = st.pts.length >= 3 ? Math.round(areaM2(st.pts)) : null;
      $("[data-area]").textContent = (st.area || 0).toLocaleString(lang() === "en" ? "en-US" : "es-MX") + " m²";
    }
    function clearPoly() { st.pts = []; redraw(); }
    $("[data-undo]").addEventListener("click", function () { st.pts.pop(); redraw(); });
    $("[data-clear]").addEventListener("click", clearPoly);
    function initMap() {
      var el = $("[data-map]");
      if (!window.L) { setStatus("[data-map-status]", t("El mapa no está disponible aquí. Escribe el área aproximada abajo.", "The map isn't available here. Type the approximate area below."), true); return; }
      var center = st.lat !== null ? [st.lat, st.lon] : [data.base.lat, data.base.lon];
      if (map) { map.invalidateSize(); map.setView(center, st.lat !== null ? 19 : 15); return; }
      map = L.map(el, { zoomControl: true, attributionControl: true }).setView(center, st.lat !== null ? 19 : 15);
      var warned = false;
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "© Esri" })
        .on("tileerror", function () { if (warned) return; warned = true; setStatus("[data-map-status]", t("El mapa satelital no cargó. Escribe el área aproximada abajo.", "The satellite map didn't load. Type the approximate area below."), true); })
        .addTo(map);
      map.on("click", function (e) { st.pts.push([e.latlng.lat, e.latlng.lng]); redraw(); });
    }

    /* Navegación */
    function validStep(n) {
      if (n === 1) {
        var g = +$("#e-invitados").value;
        if (!g || g < 1) { setStatus("[data-doc-status]", t("Indica cuántos invitados esperas.", "Tell me how many guests you expect."), true); $("#e-invitados").focus(); return false; }
        if (!$("#e-horas").value) $("#e-horas").value = 2;
      }
      if (n === 3 && st.sampleArea && !st.area && !$("#e-area").value) $("#e-area").value = st.sampleArea;
      return true;
    }
    $$("[data-next]", wz).forEach(function (b) { b.addEventListener("click", function () { if (validStep(current)) go(current + 1); }); });
    $$("[data-prev]", wz).forEach(function (b) { b.addEventListener("click", function () { go(current - 1); }); });
    $("[data-restart]").addEventListener("click", function () { go(1); });

    /* Cálculo de la propuesta */
    function haversine(a, b, c, d) {
      var R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2);
      return 2 * R * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y));
    }
    function compute() {
      var tipo = $("#e-tipo").value, G = +$("#e-invitados").value, H = Math.max(.5, +$("#e-horas").value || 2),
          ext = $("#e-espacio").value === "exterior", amb = $("#e-ambiente").value,
          A = +$("#e-area").value || st.area || null;
      var f, why;
      if (tipo === "clinica") { f = "clinica"; why = t("Para un grupo de aprendizaje, la clínica combina demostración, ejercicios de improvisación y preguntas.", "For a learning group, the clinic mixes demonstration, improvisation work and Q&A."); }
      else if (amb === "baile" || G > 80 || ((tipo === "festival" || tipo === "concierto") && G > 40)) { f = "fellowship"; why = t("Con " + G + " personas y el ambiente que buscas, el cuarteto da el cuerpo y la energía que pide el espacio.", "With " + G + " people and the mood you want, the quartet brings the body and energy the space calls for."); }
      else if (amb === "protagonista") { f = "solo"; why = t("Para un público que viene a escuchar, el saxofón solo crea un momento íntimo. Si buscas más presencia, el cuarteto también encaja.", "For an audience that comes to listen, solo sax creates an intimate moment. For more presence, the quartet also fits."); }
      else { f = G <= 60 ? "solo" : "fellowship"; why = f === "solo" ? t("Para acompañar una reunión de " + G + " personas sin tapar la conversación, el saxofón solo es ideal.", "To accompany a gathering of " + G + " without drowning conversation, solo sax is ideal.") : t("Para " + G + " personas, el cuarteto llena el espacio sin perder la elegancia.", "For " + G + " guests, the quartet fills the space without losing elegance."); }
      var sets = Math.min(4, Math.max(1, Math.round(H)));
      var lvl;
      if (f === "clinica") lvl = 1;
      else if (f === "solo") lvl = (!ext && G <= 40 && (!A || A <= 120)) ? 0 : (G <= 120 ? 1 : 2);
      else lvl = (!ext && G <= 60) ? 1 : (G <= 200 ? 2 : 3);
      if (ext && lvl < 3 && f !== "clinica") lvl = Math.max(lvl, 1);
      var sound = [t("Acústico, sin amplificación", "Acoustic, no amplification"), t("Sonido ligero", "Light sound"), t("PA mediana con mezcladora", "Mid-size PA with mixer"), t("PA de concierto", "Concert PA")][lvl];
      var cap = A ? { sit: Math.floor(A / 1.4), stand: Math.floor(A / 0.6) } : null;
      var dist = st.lat !== null ? Math.round(haversine(data.base.lat, data.base.lon, st.lat, st.lon) * 1.3) : null;
      var tar = (data.tarifas || {})[f], price = null;
      if (tar && tar.porSet) price = Math.max(tar.minimo || 0, tar.porSet * sets);
      return { tipo: tipo, invitados: G, horas: H, exterior: ext, ambiente: amb, formato: f, why: why, sets: sets, sonido: sound, area: A, cap: cap, dist: dist, price: price, lugar: st.label || $("#e-dir").value.trim(), fecha: $("#e-fecha").value };
    }
    var lastR = null;
    function render(r) {
      var loc = lang() === "en" ? "en-US" : "es-MX", fm = (data.formatos || {})[r.formato] || {};
      $("[data-r-format]").textContent = fm[lang()] || r.formato;
      $("[data-r-why]").textContent = r.why;
      $("[data-r-sets]").textContent = r.sets + (r.sets === 1 ? " set" : " sets") + t(" de 45 min", " × 45 min");
      $("[data-r-sound]").textContent = r.sonido;
      $("[data-r-area]").textContent = r.area ? r.area.toLocaleString(loc) + " m²" : "—";
      $("[data-r-cap]").textContent = r.cap ? t("≈" + r.cap.sit + " sentados · ≈" + r.cap.stand + " de pie", "≈" + r.cap.sit + " seated · ≈" + r.cap.stand + " standing") + (r.invitados > r.cap.sit ? t(" · justo para " + r.invitados, " · tight for " + r.invitados) : "") : "—";
      $("[data-r-dist]").textContent = r.dist !== null ? "≈ " + r.dist.toLocaleString(loc) + " km" : "—";
      $("[data-r-price]").textContent = r.price ? t("Desde ", "From ") + "$" + r.price.toLocaleString(loc) + " MXN" : t("Eleazar te envía la cotización", "Eleazar sends you the quote");
      $("[data-r-rider]").textContent = fm["rider_" + lang()] || "";
    }
    window.__ES_REFRESH__ = function () { if (lastR) { lastR = compute(); render(lastR); } };

    function proposalText(r, c) {
      return [t("Propuesta orientativa para Eleazar Soto", "Indicative proposal for Eleazar Soto"),
        t("Formato: ", "Format: ") + $("[data-r-format]").textContent,
        t("Evento: ", "Event: ") + r.tipo + " · " + r.invitados + t(" invitados", " guests") + " · " + (r.exterior ? t("exterior", "outdoor") : t("interior", "indoor")),
        t("Fecha: ", "Date: ") + (r.fecha || "—"), t("Lugar: ", "Place: ") + (r.lugar || "—"),
        t("Música: ", "Music: ") + $("[data-r-sets]").textContent, t("Sonido: ", "Sound: ") + r.sonido,
        t("Espacio: ", "Space: ") + $("[data-r-area]").textContent,
        t("Nombre: ", "Name: ") + c.nombre, "Email: " + c.email, "WhatsApp: " + (c.telefono || "—"), c.mensaje ? t("Nota: ", "Note: ") + c.mensaje : ""].filter(Boolean).join("\n");
    }

    $("[data-finish]").addEventListener("click", function () {
      var err = $("[data-err]"); err.hidden = true;
      var c = { nombre: $("#c-nombre").value.trim(), email: $("#c-email").value.trim(), telefono: $("#c-tel").value.trim(), mensaje: $("#c-msg").value.trim(), consent: $("#c-consent").checked };
      var problem = !c.nombre ? t("Escribe tu nombre.", "Please add your name.")
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) ? t("Revisa el email: parece incompleto.", "Check the email: it looks incomplete.")
        : !c.consent ? t("Marca la casilla para poder enviarte la propuesta.", "Tick the box so the proposal can be sent to you.") : "";
      if (problem) { err.textContent = problem; err.hidden = false; return; }
      lastR = compute(); render(lastR);
      $("[data-sent-ok]").hidden = true; $("[data-fallback]").hidden = true;
      go(5);
      var payload = { nombre: c.nombre, email: c.email, telefono: c.telefono, mensaje: c.mensaje, consent: true, idioma: lang(),
        formato: lastR.formato, ocasion: lastR.tipo, duracion: String(lastR.sets), fecha: lastR.fecha, lugar: lastR.lugar,
        resumen: $("[data-r-format]").textContent + " · " + $("[data-r-sets]").textContent,
        estudio: { invitados: lastR.invitados, horas: lastR.horas, exterior: lastR.exterior, ambiente: lastR.ambiente, area_m2: lastR.area, sonido: lastR.sonido, distancia_km: lastR.dist, lat: st.lat, lon: st.lon } };
      function fallback() {
        var txt = proposalText(lastR, c), wa = $("[data-wa-send]"), ml = $("[data-mail-send]");
        $("[data-fallback-text]").textContent = txt;
        var num = "52" + String((data.contact || {}).whatsapp || "").replace(/\D/g, "");
        if (wa) wa.href = "https://wa.me/" + num + "?text=" + encodeURIComponent(txt);
        if (ml) ml.href = "mailto:" + ((data.contact || {}).email || "") + "?subject=" + encodeURIComponent(t("Propuesta de evento", "Event proposal") + " · " + c.nombre) + "&body=" + encodeURIComponent(txt);
        $("[data-fallback]").hidden = false;
      }
      if (!API) { fallback(); return; }
      var send;
      if (data.backend === "netlify") {
        // Netlify Forms: la propuesta llega al panel de Netlify y por correo a Eleazar
        var form = { "form-name": "propuesta", nombre: c.nombre, email: c.email, telefono: c.telefono, mensaje: c.mensaje,
          formato: payload.formato, ocasion: payload.ocasion, sets: payload.duracion, fecha: payload.fecha || "", lugar: payload.lugar || "",
          resumen: payload.resumen, idioma: payload.idioma, propuesta: proposalText(lastR, c) };
        send = fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form).toString() })
          .then(function (r) { return { ok: r.ok }; });
      } else {
        send = fetch("lead.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          .then(function (r) { return r.json(); });
      }
      send.then(function (j) { if (j && j.ok) $("[data-sent-ok]").hidden = false; else fallback(); }).catch(fallback);
    });
    $("[data-copy-fallback]").addEventListener("click", function () { copyText($("[data-fallback-text]")); });
  }

  /* ---------- Copiar ---------- */
  function copyText(el, btn) {
    var txt = el.textContent;
    function select() { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    try {
      navigator.clipboard.writeText(txt).then(function () { if (btn) { var o = btn.innerHTML; btn.textContent = "✓"; setTimeout(function () { btn.innerHTML = o; }, 1400); } }, select);
    } catch (e) { select(); }
  }
  function initCopy() {
    $$("[data-copy]").forEach(function (b) { b.addEventListener("click", function () { copyText(document.getElementById(b.getAttribute("data-copy")), b); }); });
  }

  /* ---------- Asistente ---------- */
  function initChat() {
    if (!API) { var cw = $("[data-chat]"); if (cw) cw.remove(); return; }
    var wrap = $("[data-chat]"), bubble = $(".chat-bubble", wrap), panel = $(".chat-panel", wrap), log = $("[data-log]"), form = $("[data-chat-form]"), input = $("#chat-in");
    var history = [], busy = false;
    function toggle(open) {
      panel.hidden = !open; bubble.setAttribute("aria-expanded", String(open));
      if (open) setTimeout(function () { input.focus(); }, 50);
    }
    bubble.addEventListener("click", function () { toggle(panel.hidden); });
    $(".chat-close", wrap).addEventListener("click", function () { toggle(false); bubble.focus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) toggle(false); });
    function add(text, who) {
      var p = document.createElement("p"); p.className = "msg " + who; p.textContent = text; log.appendChild(p); log.scrollTop = log.scrollHeight; return p;
    }
    function offline() {
      return t("Estoy terminando de configurarme. Mientras tanto, usa «Diseña tu evento» o escribe a Eleazar por WhatsApp al " + ((data.contact || {}).whatsapp || "") + ".",
               "I'm still being set up. Meanwhile, use “Plan your event” or message Eleazar on WhatsApp at " + ((data.contact || {}).whatsapp || "") + ".");
    }
    function ask(q) {
      if (busy || !q) return; busy = true;
      add(q, "me"); input.value = "";
      var typing = add(t("Escribiendo…", "Typing…"), "bot typing");
      function done(reply) { typing.remove(); add(reply, "bot"); history.push({ role: "user", text: q }, { role: "model", text: reply }); history = history.slice(-8); busy = false; }
      if (location.protocol === "file:") { setTimeout(function () { done(offline()); }, 500); return; }
      fetch("asistente-ia.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q, history: history, idioma: lang() }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { done(j && j.reply ? j.reply : offline()); })
        .catch(function () { done(offline()); });
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); ask(input.value.trim()); });
    $$("[data-sugg] button").forEach(function (b) { b.addEventListener("click", function () { ask(b.getAttribute(lang() === "en" ? "data-q-en" : "data-q-es")); }); });
  }

  /* ---------- Redes ---------- */
  function initSocial() {
    var soc = data.social || {};
    $$("[data-social]").forEach(function (a) { var u = soc[a.getAttribute("data-social")]; if (u) { a.href = u; a.hidden = false; } else a.remove(); });
  }

  /* ---------- Videos pendientes ---------- */
  function initMedia() {
    $$("[data-pending]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); }); });
  }

  /* ---------- Menú móvil ---------- */
  function initMenu() {
    var btn = $(".sx-menu-btn"), ov = $("#sx-overlay"); if (!btn || !ov) return;
    function set(open) { ov.hidden = !open; btn.setAttribute("aria-expanded", String(open)); document.body.style.overflow = open ? "hidden" : ""; }
    btn.addEventListener("click", function () { set(ov.hidden); });
    $$("a", ov).forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
  }

  function boot() {
    safe(initMenu, "menu");
    safe(initLang, "lang");
    safe(initNav, "nav");
    safe(initReveals, "reveals");
    safe(initCount, "count");
    safe(initTilt, "tilt");
    safe(initWizard, "wizard");
    safe(initCopy, "copy");
    safe(initChat, "chat");
    safe(initSocial, "social");
    safe(initMedia, "media");
    safe(initShowcase, "showcase");
    root.classList.add("is-ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
